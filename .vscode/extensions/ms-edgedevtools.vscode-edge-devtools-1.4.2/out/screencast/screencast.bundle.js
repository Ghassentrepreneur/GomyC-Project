/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/common/webviewEvents.ts":
/*!*************************************!*\
  !*** ./src/common/webviewEvents.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.encodeMessageForChannel = exports.parseMessageFromChannel = exports.webSocketEventNames = exports.FrameToolsEventNames = exports.webviewEventNames = void 0;
exports.webviewEventNames = [
    'getState',
    'getUrl',
    'openInEditor',
    'cssMirrorContent',
    'ready',
    'setState',
    'telemetry',
    'websocket',
    'getVscodeSettings',
    'copyText',
    'focusEditor',
    'focusEditorGroup',
    'openUrl',
    'toggleScreencast',
    'toggleInspect',
];
exports.FrameToolsEventNames = [
    'sendMessageToBackend',
    'openInNewTab',
    'openInEditor',
    'cssMirrorContent',
    'recordEnumeratedHistogram',
    'recordPerformanceHistogram',
    'reportError',
    'toggleScreencast',
];
exports.webSocketEventNames = [
    'open',
    'close',
    'error',
    'message',
];
/**
 * Parse out the WebviewEvents type from a message and call the appropriate emit event
 *
 * @param message The message to parse
 * @param emit The emit callback to invoke with the event and args
 */
function parseMessageFromChannel(message, emit) {
    for (const e of exports.webviewEventNames) {
        if (message.substr(0, e.length) === e && message[e.length] === ':') {
            emit(e, message.substr(e.length + 1));
            return true;
        }
    }
    return false;
}
exports.parseMessageFromChannel = parseMessageFromChannel;
/**
 * Encode an event and arguments into a string and then post that message across via the
 * supplied object containing the postMessage function.
 * The message can be parsed on the other side using parseMessageFromChannel
 *
 * @param postMessageObject The object which contains the postMessage function
 * @param eventType The type of the message to post
 * @param args The argument object to encode and post
 * @param origin The origin (if any) to use with the postMessage call
 */
function encodeMessageForChannel(postMessageCallback, eventType, args) {
    const message = `${eventType}:${JSON.stringify(args)}`;
    postMessageCallback(message);
}
exports.encodeMessageForChannel = encodeMessageForChannel;


/***/ }),

/***/ "./src/screencast/cdp.ts":
/*!*******************************!*\
  !*** ./src/screencast/cdp.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScreencastCDPConnection = exports.vscode = void 0;
const webviewEvents_1 = __webpack_require__(/*! ../common/webviewEvents */ "./src/common/webviewEvents.ts");
exports.vscode = acquireVsCodeApi();
class ScreencastCDPConnection {
    constructor() {
        this.nextId = 0;
        this.eventCallbackMap = new Map();
        this.methodCallbackMap = new Map();
        // Handle CDP messages/events routed from the extension through post message
        window.addEventListener('message', e => {
            (0, webviewEvents_1.parseMessageFromChannel)(e.data, (eventName, args) => {
                if (eventName === 'websocket') {
                    const { message } = JSON.parse(args);
                    if (message) {
                        // Handle event responses
                        const messageObj = JSON.parse(message);
                        for (const callback of this.eventCallbackMap.get(messageObj.method) || []) {
                            callback(messageObj.params);
                        }
                        // Handle method responses
                        const methodCallback = this.methodCallbackMap.get(messageObj.id);
                        if (methodCallback) {
                            methodCallback(messageObj.result);
                            this.methodCallbackMap.delete(messageObj.id);
                        }
                    }
                    return true;
                }
                if (eventName === 'toggleInspect') {
                    const { enabled } = JSON.parse(args);
                    for (const callback of this.eventCallbackMap.get('DevTools.toggleInspect') || []) {
                        callback(enabled);
                    }
                }
                return false;
            });
        });
    }
    sendMessageToBackend(method, params, callback) {
        const id = this.nextId++;
        const cdpMessage = {
            id: id,
            method,
            params,
        };
        if (callback) {
            this.methodCallbackMap.set(id, callback);
        }
        (0, webviewEvents_1.encodeMessageForChannel)(msg => exports.vscode.postMessage(msg, '*'), 'websocket', { message: JSON.stringify(cdpMessage) });
    }
    registerForEvent(method, callback) {
        var _a;
        if (this.eventCallbackMap.has(method)) {
            (_a = this.eventCallbackMap.get(method)) === null || _a === void 0 ? void 0 : _a.push(callback);
        }
        this.eventCallbackMap.set(method, [callback]);
    }
}
exports.ScreencastCDPConnection = ScreencastCDPConnection;


/***/ }),

/***/ "./src/screencast/input.ts":
/*!*********************************!*\
  !*** ./src/screencast/input.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScreencastInputHandler = exports.MouseEventMap = void 0;
exports.MouseEventMap = {
    mousedown: 'mousePressed',
    mouseup: 'mouseReleased',
    mousemove: 'mouseMoved',
    wheel: 'mouseWheel'
};
const MouseButtonMap = [
    'left',
    'middle',
    'right',
    'back',
    'forward'
];
class ScreencastInputHandler {
    constructor(cdpConnection) {
        this.cdpConnection = cdpConnection;
        this.activeTouchParams = null;
    }
    emitMouseEvent(mouseEvent, scale) {
        const eventType = exports.MouseEventMap[mouseEvent.type];
        if (!eventType) {
            return;
        }
        this.cdpConnection.sendMessageToBackend('Input.dispatchMouseEvent', {
            type: eventType,
            clickCount: eventType === 'mousePressed' || eventType === 'mouseReleased' ? 1 : 0,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: this.modifiersForEvent(mouseEvent),
            button: MouseButtonMap[mouseEvent.button],
            buttons: mouseEvent.buttons,
            deltaX: mouseEvent.deltaX,
            deltaY: mouseEvent.deltaY
        });
    }
    emitKeyEvent(keyboardEvent) {
        // For what seems a bug to me on CDP:
        // - non printable key events only respond to object with type keydown and virtual key codes.
        // - printable characters respond only to object with type char and text property set to key.
        // This could be related:
        // https://github.com/ChromeDevTools/devtools-protocol/issues/45
        if (keyboardEvent.type === 'keydown' && keyboardEvent.key.length > 1 && keyboardEvent.key !== 'Enter') {
            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', {
                type: 'keyDown',
                windowsVirtualKeyCode: keyboardEvent.keyCode,
                nativeVirtualKeyCode: keyboardEvent.keyCode,
            });
        }
        else if (keyboardEvent.type === 'keypress') {
            const cdpObject = {
                type: 'char',
                text: keyboardEvent.key
            };
            if (keyboardEvent.key === 'Enter') {
                cdpObject.text = '\r';
            }
            this.cdpConnection.sendMessageToBackend('Input.dispatchKeyEvent', cdpObject);
        }
    }
    emitTouchFromMouseEvent(mouseEvent, scale) {
        const buttons = ['none', 'left', 'middle', 'right'];
        const eventType = exports.MouseEventMap[mouseEvent.type];
        if (!eventType) {
            return;
        }
        if (!(mouseEvent.which in buttons)) {
            return;
        }
        if (eventType !== 'mouseWheel' && buttons[mouseEvent.which] === 'none') {
            return;
        }
        const params = {
            type: eventType,
            x: Math.round(mouseEvent.offsetX / scale),
            y: Math.round(mouseEvent.offsetY / scale),
            modifiers: 0,
            button: MouseButtonMap[mouseEvent.button],
            clickCount: 0,
        };
        if (mouseEvent.type === 'wheel') {
            const wheelEvent = mouseEvent;
            params.deltaX = wheelEvent.deltaX;
            params.deltaY = -wheelEvent.deltaY;
            params.button = 'none';
        }
        else {
            this.activeTouchParams = params;
        }
        this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
    }
    cancelTouch() {
        if (this.activeTouchParams !== null) {
            const params = this.activeTouchParams;
            this.activeTouchParams = null;
            params.type = 'mouseReleased';
            this.cdpConnection.sendMessageToBackend('Input.emulateTouchFromMouseEvent', params);
        }
    }
    modifiersForEvent(event) {
        return (event.altKey ? 1 : 0) | (event.ctrlKey ? 2 : 0) | (event.metaKey ? 4 : 0) | (event.shiftKey ? 8 : 0);
    }
}
exports.ScreencastInputHandler = ScreencastInputHandler;


/***/ }),

/***/ "./src/screencast/screencast.ts":
/*!**************************************!*\
  !*** ./src/screencast/screencast.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Screencast = void 0;
const webviewEvents_1 = __webpack_require__(/*! ../common/webviewEvents */ "./src/common/webviewEvents.ts");
const cdp_1 = __webpack_require__(/*! ./cdp */ "./src/screencast/cdp.ts");
const input_1 = __webpack_require__(/*! ./input */ "./src/screencast/input.ts");
class Screencast {
    constructor() {
        this.cdpConnection = new cdp_1.ScreencastCDPConnection();
        this.history = [];
        this.historyIndex = 0;
        this.fixedWidth = 0;
        this.fixedHeight = 0;
        this.inspectMode = false;
        this.backButton = document.getElementById('back');
        this.forwardButton = document.getElementById('forward');
        this.reloadButton = document.getElementById('reload');
        this.rotateButton = document.getElementById('rotate');
        this.urlInput = document.getElementById('url');
        this.screencastImage = document.getElementById('canvas');
        this.screencastWrapper = document.getElementById('canvas-wrapper');
        this.deviceSelect = document.getElementById('device');
        this.inactiveOverlay = document.getElementById('inactive-overlay');
        this.backButton.addEventListener('click', () => this.onBackClick());
        this.forwardButton.addEventListener('click', () => this.onForwardClick());
        this.reloadButton.addEventListener('click', () => this.onReloadClick());
        this.rotateButton.addEventListener('click', () => this.onRotateClick());
        this.urlInput.addEventListener('keydown', event => this.onUrlKeyDown(event));
        this.deviceSelect.addEventListener('change', () => {
            if (this.deviceSelect.value.toLowerCase() === 'desktop') {
                this.fixedWidth = 0;
                this.fixedHeight = 0;
                this.screencastWrapper.classList.add('desktop');
            }
            else {
                const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
                const deviceWidth = selectedOption.getAttribute('devicewidth');
                const deviceHeight = selectedOption.getAttribute('deviceheight');
                if (deviceWidth && deviceHeight) {
                    this.fixedWidth = parseInt(deviceWidth);
                    this.fixedHeight = parseInt(deviceHeight);
                }
                else {
                    this.reportError(0 /* Error */, 'Error while getting screencast width and height.', `Actual width: ${deviceWidth}, height: ${deviceHeight}`);
                }
                this.screencastWrapper.classList.remove('desktop');
            }
            this.updateEmulation();
        });
        this.cdpConnection.registerForEvent('Page.frameNavigated', result => this.onFrameNavigated(result));
        this.cdpConnection.registerForEvent('Page.screencastFrame', result => this.onScreencastFrame(result));
        this.cdpConnection.registerForEvent('Page.screencastVisibilityChanged', result => this.onScreencastVisibilityChanged(result));
        // This message comes from the DevToolsPanel instance.
        this.cdpConnection.registerForEvent('DevTools.toggleInspect', result => this.onToggleInspect(result));
        this.inputHandler = new input_1.ScreencastInputHandler(this.cdpConnection);
        this.cdpConnection.sendMessageToBackend('Page.enable', {});
        // Optimizing the resize event to limit how often can it be called.
        let resizeTimeout = 0;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateEmulation(), 100);
        });
        this.registerInputListeners();
        // Start screencast
        this.updateEmulation();
        this.updateHistory();
    }
    get width() {
        return this.fixedWidth || this.screencastWrapper.offsetWidth;
    }
    get height() {
        return this.fixedHeight || this.screencastWrapper.offsetHeight;
    }
    registerInputListeners() {
        // Disable context menu on screencast image
        this.screencastImage.addEventListener('contextmenu', event => event.preventDefault());
        for (const eventName of Object.keys(input_1.MouseEventMap)) {
            this.screencastImage.addEventListener(eventName, event => {
                const scale = this.screencastImage.offsetWidth / this.screencastImage.naturalWidth * window.devicePixelRatio;
                const mouseEvent = event;
                if (this.isDeviceTouch() && !this.inspectMode) {
                    this.inputHandler.emitTouchFromMouseEvent(mouseEvent, scale);
                }
                else if (mouseEvent.button !== 2 /* right click */) {
                    this.inputHandler.emitMouseEvent(mouseEvent, scale);
                }
            });
        }
        for (const eventName of ['keydown', 'keypress']) {
            this.screencastImage.addEventListener(eventName, event => {
                this.inputHandler.emitKeyEvent(event);
            });
        }
    }
    updateHistory() {
        this.cdpConnection.sendMessageToBackend('Page.getNavigationHistory', {}, result => {
            const { currentIndex, entries } = result;
            this.history = entries;
            this.historyIndex = currentIndex;
            this.backButton.disabled = this.historyIndex < 1;
            this.forwardButton.disabled = this.historyIndex >= this.history.length - 1;
            this.urlInput.value = this.history[this.historyIndex].url;
        });
    }
    updateEmulation() {
        const isTouch = this.isDeviceTouch();
        const deviceMetricsParams = {
            width: this.width,
            height: this.height,
            deviceScaleFactor: 0,
            mobile: isTouch,
        };
        const touchEmulationParams = {
            enabled: isTouch,
            maxTouchPoints: 1,
        };
        this.cdpConnection.sendMessageToBackend('Emulation.setUserAgentOverride', {
            userAgent: this.deviceUserAgent(),
        });
        this.cdpConnection.sendMessageToBackend('Emulation.setDeviceMetricsOverride', deviceMetricsParams);
        this.cdpConnection.sendMessageToBackend('Emulation.setTouchEmulationEnabled', touchEmulationParams);
        this.toggleTouchMode();
        this.updateScreencast();
    }
    reportError(type, message, stack) {
        // Package up the error info to send to the extension
        const data = { type, message, stack };
        // Inform the extension of the DevTools telemetry event
        this.sendTelemetry({
            data,
            event: 'error',
            name: 'screencast error',
        });
    }
    sendTelemetry(telemetry) {
        // Forward the data to the extension
        (0, webviewEvents_1.encodeMessageForChannel)(msg => cdp_1.vscode.postMessage(msg, '*'), 'telemetry', telemetry);
    }
    isDeviceTouch() {
        const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
        return selectedOption.getAttribute('touch') === 'true' || selectedOption.getAttribute('mobile') === 'true';
    }
    deviceUserAgent() {
        if (this.deviceSelect.value.toLowerCase() === 'desktop') {
            return '';
        }
        const selectedOption = this.deviceSelect[this.deviceSelect.selectedIndex];
        return unescape(selectedOption.getAttribute('userAgent') || '');
    }
    updateScreencast() {
        const screencastParams = {
            format: 'png',
            quality: 100,
            maxWidth: Math.floor(this.width * window.devicePixelRatio),
            maxHeight: Math.floor(this.height * window.devicePixelRatio)
        };
        this.cdpConnection.sendMessageToBackend('Page.startScreencast', screencastParams);
    }
    onBackClick() {
        if (this.historyIndex > 0) {
            const entryId = this.history[this.historyIndex - 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', { entryId });
        }
    }
    onForwardClick() {
        if (this.historyIndex < this.history.length - 1) {
            const entryId = this.history[this.historyIndex + 1].id;
            this.cdpConnection.sendMessageToBackend('Page.navigateToHistoryEntry', { entryId });
        }
    }
    onFrameNavigated({ frame }) {
        if (!frame.parentId) {
            this.updateHistory();
        }
    }
    onReloadClick() {
        this.cdpConnection.sendMessageToBackend('Page.reload', {});
    }
    onRotateClick() {
        const width = this.fixedHeight;
        const height = this.fixedWidth;
        this.fixedWidth = width;
        this.fixedHeight = height;
        this.updateEmulation();
    }
    onUrlKeyDown(event) {
        let url = this.urlInput.value;
        if (event.key === 'Enter' && url) {
            if (!url.startsWith('http') && !url.startsWith('file')) {
                url = 'http://' + url;
            }
            this.cdpConnection.sendMessageToBackend('Page.navigate', { url });
        }
    }
    onScreencastFrame({ data, sessionId }) {
        const expectedWidth = Math.floor(this.width * window.devicePixelRatio);
        const expectedHeight = Math.floor(this.height * window.devicePixelRatio);
        this.screencastImage.src = `data:image/png;base64,${data}`;
        this.screencastImage.style.width = `${this.width}px`;
        if (this.screencastImage.naturalWidth !== expectedWidth || this.screencastImage.naturalHeight !== expectedHeight) {
            this.updateEmulation();
        }
        this.cdpConnection.sendMessageToBackend('Page.screencastFrameAck', { sessionId });
    }
    onScreencastVisibilityChanged({ visible }) {
        this.inactiveOverlay.hidden = visible;
    }
    onToggleInspect({ enabled }) {
        this.inspectMode = enabled;
        this.toggleTouchMode();
    }
    toggleTouchMode() {
        const touchEnabled = this.isDeviceTouch() && !this.inspectMode;
        const touchEventsParams = {
            enabled: touchEnabled,
            configuration: touchEnabled ? 'mobile' : 'desktop',
        };
        this.screencastImage.classList.toggle('touch', touchEnabled);
        this.cdpConnection.sendMessageToBackend('Emulation.setEmitTouchEventsForMouse', touchEventsParams);
    }
}
exports.Screencast = Screencast;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!********************************!*\
  !*** ./src/screencast/main.ts ***!
  \********************************/

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", ({ value: true }));
const screencast_1 = __webpack_require__(/*! ./screencast */ "./src/screencast/screencast.ts");
new screencast_1.Screencast();

})();

/******/ })()
;
//# sourceMappingURL=screencast.bundle.js.map