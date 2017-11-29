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
const markuplint = require("./core");
const readFile = util.promisify(fs.readFile);
const exists = util.promisify(fs.exists);
const readdir = util.promisify(fs.readdir);
function verify(html, ruleset, rules) {
    return __awaiter(this, void 0, void 0, function* () {
        return markuplint.verify(html, ruleset, rules);
    });
}
exports.verify = verify;
function verifyFile(filePath, ruleset, rules) {
    return __awaiter(this, void 0, void 0, function* () {
        const absFilePath = path.resolve(filePath);
        const parsedPath = path.parse(absFilePath);
        const dir = path.dirname(absFilePath);
        ruleset = ruleset || (yield getRuleset(dir));
        rules = rules || (yield getRuleModules());
        const html = yield readFile(filePath, 'utf-8');
        return markuplint.verify(html, ruleset, rules);
    });
}
exports.verifyFile = verifyFile;
function getRuleModules() {
    return __awaiter(this, void 0, void 0, function* () {
        const rules = [];
        const ruleDir = path.resolve(__dirname, './rules');
        const ruleFiles = yield readdir(ruleDir);
        for (const filePath of ruleFiles) {
            if (/^markuplint-rule-[a-z\-]+\.js$/i.test(filePath)) {
                const mod = yield Promise.resolve().then(() => require(path.resolve(ruleDir, filePath)));
                const CustomRule /* Subclass of Rule */ = mod.default;
                rules.push(new CustomRule());
            }
        }
        return rules;
    });
}
function getRuleset(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const rulesetFileNameList = [
            '.markuplintrc',
            'markuplintrc.json',
            'markuplint.config.json',
            'markuplint.json',
            'markuplint.config.js',
        ];
        const rulesetFilePath = yield fileSearch(rulesetFileNameList, dir);
        const ruleset = yield Promise.resolve().then(() => require(rulesetFilePath));
        return ruleset;
    });
}
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
