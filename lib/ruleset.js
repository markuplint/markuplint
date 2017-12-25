"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const stripJsonComments = require("strip-json-comments");
const fileSearch_1 = require("./util/fileSearch");
const readFile = util.promisify(fs.readFile);
class Ruleset {
    constructor(json, rules) { }
}
exports.Ruleset = Ruleset;
async function getRuleset(dir) {
    const rulesetFileNameList = [
        '.markuplintrc',
        'markuplintrc.json',
        'markuplint.config.json',
        'markuplint.json',
        'markuplint.config.js',
    ];
    const rulesetFilePath = await fileSearch_1.default(rulesetFileNameList, dir);
    const ruleset = await importRulesetFile(rulesetFilePath);
    return ruleset;
}
exports.getRuleset = getRuleset;
async function importRulesetFile(filePath) {
    try {
        const text = await readFile(filePath, { encoding: 'utf-8' });
        return JSON.parse(stripJsonComments(text));
    }
    catch (err) {
        return {
            rules: {},
        };
    }
}
