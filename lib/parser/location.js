"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getOffset(token, raw, offset = 0) {
    return raw.indexOf(token) + offset;
}
exports.getOffset = getOffset;
function getLine(token, raw, line) {
    // const i = getOffset(token, raw);
    // const before = raw.substr(0, i);
    // const after = raw.substr(0, token.length);
    return line;
}
exports.getLine = getLine;
function getCol(token, raw, col) {
    // const i = getOffset(token, raw);
    // const before = raw.substr(0, i);
    return col;
}
exports.getCol = getCol;
function getEndLine(token, line) {
    return token.split(/\r?\n/).length - 1 + line;
}
exports.getEndLine = getEndLine;
function getEndCol(token, col) {
    const lines = token.split(/\r?\n/);
    const lineCount = lines.length;
    const lastLine = lines.pop();
    return lineCount > 1 ? lastLine.length + 1 : col + token.length;
}
exports.getEndCol = getEndCol;
