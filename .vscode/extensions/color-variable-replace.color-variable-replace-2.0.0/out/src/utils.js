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
const fs = require("fs");
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.readFile = readFile;
function parseVariable(variableFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const reg = /([a-zA-Z_\$][a-zA-Z0-9_\-\$]*)\s*=\s*(#(?:[\da-fA-F]{6}|[\da-fA-F]{3}))/g;
        const nameToValue = {};
        for (const path of variableFiles) {
            const content = yield readFile(path);
            while (true) {
                const result = reg.exec(content);
                if (!result) {
                    break;
                }
                else {
                    nameToValue[result[1]] = result[2].toUpperCase();
                }
            }
        }
        return nameToValue;
    });
}
exports.parseVariable = parseVariable;
function getPriorWeight(name, prior) {
    const priorItem = prior.find((p) => {
        if (typeof p === 'string' && name.indexOf(p) > -1) {
            return true;
        }
        else if (p instanceof RegExp && p.test(name)) {
            return true;
        }
        else {
            return false;
        }
    });
    if (!priorItem) {
        return 0;
    }
    else {
        return prior.length - prior.indexOf(priorItem);
    }
}
exports.getPriorWeight = getPriorWeight;
function parseVariableByPrior(variableFiles, prior) {
    return __awaiter(this, void 0, void 0, function* () {
        const nameToValue = yield parseVariable(variableFiles);
        const variablePriorMap = {};
        for (const name of Object.keys(nameToValue)) {
            const priorWeight = getPriorWeight(name, prior);
            const valueToName = variablePriorMap[priorWeight] || {};
            valueToName[nameToValue[name]] = name;
            variablePriorMap[priorWeight] = valueToName;
        }
        return variablePriorMap;
    });
}
exports.parseVariableByPrior = parseVariableByPrior;
//# sourceMappingURL=utils.js.map