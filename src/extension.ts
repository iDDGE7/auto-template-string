import * as vscode from 'vscode';

let isApplyingEdit = false;
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
        const isEventUndo = event.reason === vscode.TextDocumentChangeReason.Undo;
        const isEventRedo = event.reason === vscode.TextDocumentChangeReason.Redo;

        if (isEventUndo || isEventRedo) {
            return;
        }

        if (isApplyingEdit) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        if (event.document !== editor.document) {
            return;
        }

        const aLlowedLanguages = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'svelte'];
        const languageId = editor.document.languageId;
        if (!aLlowedLanguages.includes(languageId)) {
            return;
        }

        const change = event.contentChanges[0];
        if (!change.range.isEmpty) {
            return;
        }
        const line = editor.document.lineAt(change.range.start.line);

        const regexpropWithInterpolationRegexx =
            /([a-zA-Z0-9-]+)=(")([^"\`]*?\$\{[^"\`]*)(")|([a-zA-Z0-9-]+)=(')([^'\`]*?\$\{[^'\`]*)(')/;
        const matchPropWithInterpotaltion = line.text.match(regexpropWithInterpolationRegexx);

        if (matchPropWithInterpotaltion) {
            handlerMatchPropJsxWithInterpolation(editor, matchPropWithInterpotaltion, line);
            return;
        }

        const regexpStringWithInterpolationRegexx = /"([^"\`]*?\$\{[^"\`]*)(")|'([^'\`]*?\$\{[^"\`]*)(')/;
        const matchStringWithInterpolation = line.text.match(regexpStringWithInterpolationRegexx);

        if (matchStringWithInterpolation) {
            handlerMatchStringWithInterpolation(editor, matchStringWithInterpolation, line);
            return;
        }
    });

    context.subscriptions.push(disposable);
}

function handlerMatchPropJsxWithInterpolation(
    editor: vscode.TextEditor,
    match: RegExpMatchArray,
    line: vscode.TextLine
) {
    const propName = match[1] || match[5];
    const contentInsideQuotes = (match[3] || match[7]).replace(/\$\{(?!\})/g, '${}');
    const newContent = `${propName}={\`${contentInsideQuotes}\`}`;
    const matchIndex = match.index || 0;
    const startPos = line.range.start.translate(0, matchIndex);
    const endPos = startPos.translate(0, match[0].length);

    const replaceRange = new vscode.Range(startPos, endPos);
    applyTemplateStringEdit(editor, replaceRange, newContent);
}

function handlerMatchStringWithInterpolation(
    editor: vscode.TextEditor,
    match: RegExpMatchArray,
    line: vscode.TextLine
) {
    const contentInsideQuotes = (match[1] || match[3]).replace(/\$\{(?!\})/g, '${}');
    const newContent = `\`${contentInsideQuotes}\``;
    const matchIndex = match.index || 0;
    const startPos = line.range.start.translate(0, matchIndex);
    const endPos = startPos.translate(0, match[0].length);
    const replaceRange = new vscode.Range(startPos, endPos);
    applyTemplateStringEdit(editor, replaceRange, newContent);
}

async function applyTemplateStringEdit(editor: vscode.TextEditor, replaceRange: vscode.Range, newContent: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(editor.document.uri, replaceRange, newContent);

    isApplyingEdit = true;
    try {
        const success = await vscode.workspace.applyEdit(edit);
        if (success && editor) {
            const newCursorOffset = newContent.indexOf('${');
            if (newCursorOffset !== -1) {
                const newPosition = replaceRange.start.translate(0, newCursorOffset + 2);
                const newSelection = new vscode.Selection(newPosition, newPosition);
                editor.selection = newSelection;
            }
        }
    } catch (error) {
        console.error('Error al aplicar la edición de template string:', error);
    } finally {
        isApplyingEdit = false;
    }
}

export function deactivate() {}
