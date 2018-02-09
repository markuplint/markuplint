"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getCol(html, col) {
    const lines = html.split(/\r?\n/);
    const lineCount = lines.length;
    const lastLine = lines.pop();
    return lineCount > 1 ? lastLine.length + 1 : col + html.length;
}
exports.default = getCol;
