"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const exists = util.promisify(fs.exists);
function fileSearch(fileList, dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const notfoundFiles = [];
        const dirList = dir.split(path.sep);
        while (dirList.length) {
            const absFileList = fileList.map((filePath) => path.join(path.sep, ...dirList, filePath));
            for (const filePath of absFileList) {
                if (yield exists(filePath)) {
                    return filePath;
                }
                else {
                    notfoundFiles.push(filePath);
                }
            }
            dirList.pop();
        }
        throw new ReferenceError(`A Ruleset file is not found.\n${notfoundFiles.join('\n')}`);
    });
}
exports.default = fileSearch;
