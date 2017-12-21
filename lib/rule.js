"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
// @ts-ignore
const findNodeModules = require("find-node-modules");
const readdir = util.promisify(fs.readdir);
class Rule {
    constructor() {
        this.defaultLevel = 'error';
    }
    optimizeOption(option) {
        if (typeof option === 'boolean') {
            return {
                disabled: !option,
                level: this.defaultLevel,
                value: this.defaultValue,
                option: null,
            };
        }
        return {
            disabled: false,
            level: option[0],
            value: option[1],
            option: option[2],
        };
    }
}
exports.default = Rule;
class CustomRule extends Rule {
    constructor(o) {
        super();
        this.name = o.name;
        this._verify = o.verify;
    }
    async verify(document, config, ruleset, locale) {
        const results = await this._verify(document, config, ruleset, locale);
        return results.map((result) => {
            return {
                level: result.level,
                message: result.message,
                line: result.line,
                col: result.col,
                raw: result.raw,
                ruleId: result.ruleId ? `${this.name}/${result.ruleId}` : `${this.name}/${this.name}`,
            };
        });
    }
}
exports.CustomRule = CustomRule;
async function getRuleModules() {
    const rules = [];
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, './rules')));
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
    rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
    return rules;
}
exports.getRuleModules = getRuleModules;
async function resolveRuleModule(modulePath) {
    try {
        const mod = await Promise.resolve().then(() => require(modulePath));
        const ModuleRule /* Subclass of Rule */ = mod.default;
        const rule = ModuleRule.rule ? new CustomRule(ModuleRule.rule) : new ModuleRule();
        return rule;
    }
    catch (err) {
        // @ts-ignore
        if (err instanceof Error && err.code === 'MODULE_NOT_FOUND') {
            console.warn(`[markuplint] Cannot find rule module: ${modulePath} (${err.message})`);
        }
        else {
            throw err;
        }
    }
}
exports.resolveRuleModule = resolveRuleModule;
async function resolveRuleModules(pattern, ruleDir) {
    const rules = [];
    try {
        const ruleFiles = await readdir(ruleDir);
        for (const filePath of ruleFiles) {
            if (pattern.test(filePath)) {
                const rule = await resolveRuleModule(path.resolve(ruleDir, filePath));
                if (rule) {
                    rules.push(rule);
                }
            }
        }
    }
    catch (e) {
        // @ts-ignore
        if (!(e instanceof Error && e.code === 'ENOENT')) {
            throw e;
        }
    }
    return rules;
}
exports.resolveRuleModules = resolveRuleModules;
function nearNodeModules() {
    const moduleDirs = findNodeModules({ cwd: process.cwd() }).map((dir) => path.resolve(dir));
    const moduleDir = moduleDirs[0];
    if (!moduleDir) {
        throw new Error(`Directory node_module not found.`);
    }
    return moduleDir;
}
