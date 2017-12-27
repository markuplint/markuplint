"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const core = require("./core");
const rule_1 = require("./rule");
const ruleset_1 = require("./ruleset");
const osLocale_1 = require("./util/osLocale");
const readFile = util.promisify(fs.readFile);
async function verify(html, config, rules, locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    const ruleset = await ruleset_1.default.create(config, rules);
    return await core.verify(html, ruleset, locale);
}
exports.verify = verify;
async function verifyOnWorkspace(html, workspace) {
    workspace = workspace ? workspace : process.cwd();
    const locale = await osLocale_1.default();
    const rules = await rule_1.getRuleModules();
    const ruleset = await ruleset_1.default.create(workspace, rules);
    return await core.verify(html, ruleset, locale);
}
exports.verifyOnWorkspace = verifyOnWorkspace;
async function verifyFile(filePath, rules, locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    const absFilePath = path.resolve(filePath);
    const parsedPath = path.parse(absFilePath);
    const dir = path.dirname(absFilePath);
    rules = rules || await rule_1.getRuleModules();
    const ruleset = await ruleset_1.default.create(dir, rules);
    const html = await readFile(filePath, 'utf-8');
    const reports = await core.verify(html, ruleset, locale);
    return {
        html,
        reports,
    };
}
exports.verifyFile = verifyFile;
