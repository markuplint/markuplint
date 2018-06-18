"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const exists = (p) => {
    return new Promise((r, e) => {
        fs_1.default.exists(p, r);
    });
};
async function fileSearch(fileList, dir) {
    const notfoundFiles = [];
    const dirList = dir.split(path_1.default.sep);
    while (dirList.length) {
        const absFileList = fileList.map(filePath => path_1.default.join(path_1.default.sep, ...dirList, filePath));
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
