"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const utils_1 = require("./utils");
class Replacer {
    constructor(config) {
        this.variableFiles = config.variableFiles;
        this.prior = config.prior;
        this.unReplaceWarn = config.unReplaceWarn;
        this.variablePriorMap = {};
    }
    replaceFile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.initialVariable();
            }
            catch (err) {
                console.error(err);
            }
            this.replace();
        });
    }
    replace() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeTextEditor = vscode_1.window.activeTextEditor;
            if (!activeTextEditor) {
                return;
            }
            const document = activeTextEditor.document;
            const start = new vscode_1.Position(0, 0);
            const end = new vscode_1.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            const range = new vscode_1.Range(start, end);
            const content = document.getText(range);
            const reg = /#([\da-fA-F]{6}|[\da-fA-F]{3})/g;
            let unReplacedCount = 0;
            const replaced = content.replace(reg, (match) => {
                const name = this.findVariableName(match.toUpperCase());
                if (name) {
                    return name;
                }
                else {
                    unReplacedCount++;
                    return match;
                }
            });
            activeTextEditor.edit((textEditor) => {
                textEditor.replace(range, replaced);
                if (this.unReplaceWarn && unReplacedCount > 0) {
                    vscode_1.window.showWarningMessage(`有${unReplacedCount}个颜色值没有找到对应的变量`);
                }
            });
        });
    }
    initialVariable() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.variablePriorMap = yield utils_1.parseVariableByPrior(this.variableFiles, this.prior);
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    findVariableName(value) {
        for (let priorWeight = this.prior.length; priorWeight > -1; priorWeight--) {
            const valueToName = this.variablePriorMap[priorWeight];
            const variableName = valueToName && valueToName[value];
            if (variableName) {
                return variableName;
            }
        }
        return undefined;
    }
}
exports.Replacer = Replacer;
//# sourceMappingURL=replacer.js.map