"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const exists = (p) => {
    return new Promise((r, e) => {
        fs.exists(p, r);
    });
};
async function fileSearch(fileList, dir) {
    const notfoundFiles = [];
    const dirList = dir.split(path.sep);
    while (dirList.length) {
        const absFileList = fileList.map((filePath) => path.join(path.sep, ...dirList, filePath));
        for (const filePath of absFileList) {
            if (await exists(filePath)) {
                return filePath;
            }
            else {
                notfoundFiles.push(filePath);
            }
        }
        dirList.pop();
    }
    throw new ReferenceError(`A Ruleset file is not found.\n${notfoundFiles.join('\n')}`);
}
exports.default = fileSearch;
