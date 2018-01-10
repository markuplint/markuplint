"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getLine(html, line) {
    return html.split(/\r?\n/).length - 1 + line;
}
exports.default = getLine;
