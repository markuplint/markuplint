"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(searches, text, currentLine, currentCol) {
    const lines = text.split(/\r?\n/g);
    const foundLocations = [];
    lines.forEach((lineText, i) => {
        let offset = 0;
        for (const char of lineText) {
            if (searches.includes(char)) {
                const line = i + currentLine;
                const col = i === 0 ? +offset + currentCol : +offset + 1;
                // for debug
                // console.log({ lineText, currentLine, currentCol, char, i, offset, line, col });
                // console.log(`${'_'.repeat(currentCol)}${lineText}`);
                // console.log(`${'_'.repeat(col)}${char}`);
                foundLocations.push({
                    line,
                    col,
                    raw: char,
                });
            }
            offset++;
        }
    });
    return foundLocations;
}
exports.default = default_1;
