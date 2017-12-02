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
const rule_1 = require("./rule");
const ruleset_1 = require("./ruleset");
const readFile = util.promisify(fs.readFile);
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
        ruleset = ruleset || (yield ruleset_1.getRuleset(dir));
        rules = rules || (yield rule_1.getRuleModules());
        const html = yield readFile(filePath, 'utf-8');
        const reports = markuplint.verify(html, ruleset, rules);
        return {
            html,
            reports,
        };
    });
}
exports.verifyFile = verifyFile;
