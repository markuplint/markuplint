"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const osLocale = require("os-locale");
const markuplint = require("./core");
const rule_1 = require("./rule");
const ruleset_1 = require("./ruleset");
const readFile = util.promisify(fs.readFile);
async function verify(html, ruleset, rules, locale) {
    if (!locale) {
        locale = await osLocale({ spawn: true });
    }
    return await markuplint.verify(html, ruleset, rules, locale);
}
exports.verify = verify;
async function verifyFile(filePath, ruleset, rules, locale) {
    if (!locale) {
        locale = await osLocale({ spawn: true });
    }
    const absFilePath = path.resolve(filePath);
    const parsedPath = path.parse(absFilePath);
    const dir = path.dirname(absFilePath);
    ruleset = ruleset || await ruleset_1.getRuleset(dir);
    rules = rules || await rule_1.getRuleModules();
    const html = await readFile(filePath, 'utf-8');
    const reports = await markuplint.verify(html, ruleset, rules, locale);
    return {
        html,
        reports,
    };
}
exports.verifyFile = verifyFile;
