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
const vscode = require("vscode");
const utils_1 = require("./utils");
// class ColorCompletionIem implements vscode.CompletionItem {
// }
class Completor {
    constructor(config) {
        this.insertType = config.inertType;
        this.variableFiles = config.variableFiles;
        this.prior = config.prior;
        this.initialVariables();
    }
    provideCompletionItems(document, position) {
        const start = new vscode.Position(position.line, 0);
        const range = new vscode.Range(start, position);
        const currentLine = document.getText(range);
        const currentColorIndex = currentLine.lastIndexOf('#');
        const currentColor = currentColorIndex > -1 ? currentLine.slice(currentColorIndex) : '';
        if (this.variablePriorMap && currentColor && currentColor.length > 1 && currentColor.length < 7) {
            const colors = this.getPossibleColorValue(currentColor);
            return colors.map((value) => {
                const item = new vscode.CompletionItem(value);
                const name = this.findVariableName(value);
                item.detail = name;
                if (this.insertType === 'var') {
                    item.insertText = name;
                }
                else {
                    item.insertText = value;
                }
                return item;
            });
        }
        else {
            return [];
        }
    }
    initialVariables() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.variablePriorMap) {
                return;
            }
            this.variablePriorMap = yield utils_1.parseVariableByPrior(this.variableFiles, this.prior);
            this.allColorValues = Object.keys(this.variablePriorMap)
                .map((key) => this.variablePriorMap[key])
                .map((valueToName) => {
                return Object.keys(valueToName)
                    .reduce((pre, value) => {
                    pre.push(value);
                    return pre;
                }, []);
            })
                .reduce((result, arr) => result.concat(arr), []);
        });
    }
    getPossibleColorValue(key) {
        return this.allColorValues.filter((value) => value.startsWith(key));
    }
    findVariableName(value) {
        for (let priorWeight = this.prior.length; priorWeight > -1; priorWeight--) {
            const valueToName = this.variablePriorMap[priorWeight];
            const variableName = valueToName && valueToName[value];
            if (variableName) {
                return variableName;
            }
        }
        return '';
    }
}
exports.Completor = Completor;
//# sourceMappingURL=completor.js.map