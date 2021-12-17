'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require("path");
const replacer_1 = require("./replacer");
const completor_1 = require("./completor");
const CONFIG_NAME = 'colorReplace';
const COMMAND = 'extension.colorReplace';
function activate(context) {
    const rootPath = vscode.workspace.rootPath;
    const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAME);
    const config = {
        variableFiles: workspaceConfig.variableFiles.map((p) => path.join(rootPath, p)),
        prior: workspaceConfig.prior,
        unReplaceWarn: workspaceConfig.unReplaceWarn,
        inertType: workspaceConfig.inertType,
        onSave: workspaceConfig.onSave
    };
    const variableFiles = workspaceConfig.get('variableFiles', []).map((p) => path.join(rootPath, p));
    const prior = workspaceConfig.get('prior', []);
    if (workspaceConfig.onSave) {
        vscode.workspace.onWillSaveTextDocument((document) => {
            return document.waitUntil(vscode.commands.executeCommand(COMMAND));
        });
    }
    const command = vscode.commands.registerCommand(COMMAND, () => {
        if (!rootPath) {
            return;
        }
        const repleacer = new replacer_1.Replacer(config);
        return repleacer.replaceFile();
    });
    const completor = new completor_1.Completor(config);
    const trigger = [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'a', 'b', 'c', 'd', 'e', 'f',
        'A', 'B', 'C', 'D', 'E', 'F'
    ];
    const completion = vscode.languages.registerCompletionItemProvider('*', completor, ...trigger);
    // console.log(completor);
    context.subscriptions.push(command);
    context.subscriptions.push(completion);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map