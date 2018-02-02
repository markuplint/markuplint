"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const findNodeModules = require("find-node-modules");
const fs = require("fs");
const path = require("path");
const util = require("util");
const custom_rule_1 = require("./custom-rule");
const readdir = util.promisify(fs.readdir);
async function ruleModulesLoader() {
    const rules = [];
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(__dirname, '../rules')));
    rules.push(...await resolveRuleModules(/^markuplint-rule-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, path.resolve(process.cwd(), './rules')));
    rules.push(...await resolveRuleModules(/^markuplint-plugin-[a-z]+(?:-[a-z]+)*(?:\.js)?$/i, nearNodeModules()));
    return rules;
}
exports.default = ruleModulesLoader;
async function resolveRuleModules(pattern, ruleDir) {
    const rules = [];
    if (!ruleDir) {
        return rules;
    }
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
async function resolveRuleModule(modulePath) {
    try {
        const mod = await Promise.resolve().then(() => require(modulePath));
        const modRule /* Subclass of Rule */ = mod.default;
        const rule = modRule.rule ? new custom_rule_1.default(modRule.rule) : modRule;
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
function nearNodeModules() {
    const moduleDirs = findNodeModules({ cwd: process.cwd() }).map((dir) => path.resolve(dir));
    const moduleDir = moduleDirs[0];
    return moduleDir || '';
}
