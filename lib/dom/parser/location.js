"use strict";
// export function getOffset (token: string, raw: string, offset = 0) {
// 	return raw.indexOf(token) + offset;
// }
Object.defineProperty(exports, "__esModule", { value: true });
function getLine(token, line) {
    const hasBr = hasLineBroke(token);
    if (!hasBr) {
        return line;
    }
    // const i = getOffset(token, raw);
    // const before = raw.substr(0, i);
    // const after = raw.substr(0, token.length);
    return token.split(/\r?\n/).length - 1 + line;
}
exports.getLine = getLine;
function getCol(token, col) {
    const hasBr = hasLineBroke(token);
    if (!hasBr) {
        return col;
    }
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
function hasLineBroke(token) {
    return /\r?\n/.test(token);
}
