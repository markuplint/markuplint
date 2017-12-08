"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const readdir = util.promisify(fs.readdir);
class Rule {
    constructor() {
        this.defaultLevel = 'error';
    }
    optimizeOption(option) {
        if (typeof option === 'boolean') {
            return {
                disabled: option,
                level: this.defaultLevel,
                value: this.defaultValue,
                option: null,
            };
        }
        return {
            disabled: true,
            level: option[0],
            value: option[1],
            option: option[2],
        };
    }
}
exports.default = Rule;
async function getRuleModules() {
    const rules = [];
    const ruleDir = path.resolve(__dirname, './rules');
    const ruleFiles = await readdir(ruleDir);
    for (const filePath of ruleFiles) {
        if (/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i.test(filePath)) {
            try {
                const mod = await Promise.resolve().then(() => require(path.resolve(ruleDir, filePath)));
                const CustomRule /* Subclass of Rule */ = mod.default;
                rules.push(new CustomRule());
            }
            catch (err) {
                // @ts-ignore
                if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
                    console.warn(`[markuplint] Cannot find rule module: ${filePath}`);
                }
                else {
                    throw err;
                }
            }
        }
    }
    return rules;
}
exports.getRuleModules = getRuleModules;
