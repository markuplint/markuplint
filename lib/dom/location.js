"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Location {
    constructor(line, col, endLine, endCol, startOffset, endOffset) {
        this.line = line;
        this.col = col;
        this.endLine = endLine;
        this.endCol = endCol;
        this.startOffset = startOffset;
        this.endOffset = endOffset;
    }
}
exports.default = Location;
