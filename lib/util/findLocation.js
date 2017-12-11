"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(searches, text, currentLine, currentCol) {
    const lines = text.split(/\r?\n/g);
    const foundLocations = [];
    lines.forEach((line, i) => {
        for (const search of searches) {
            const offset = line.indexOf(search);
            if (offset > 0) {
                console.log({ line, search, offset });
                foundLocations.push({
                    line: i + currentLine,
                    col: i === 0 ? offset + currentCol : offset + 1,
                    raw: search,
                });
            }
        }
    });
    return foundLocations;
}
exports.default = default_1;
