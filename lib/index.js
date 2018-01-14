"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const core_1 = require("./core");
const rule_1 = require("./rule");
const ruleset_1 = require("./ruleset");
const osLocale_1 = require("./util/osLocale");
const readFile = util.promisify(fs.readFile);
async function verify(html, config, rules, locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    const ruleset = await ruleset_1.default.create(config, rules);
    const core = new core_1.default(html, ruleset, locale);
    return await core.verify();
}
exports.verify = verify;
async function verifyOnWorkspace(html, workspace) {
    workspace = workspace ? workspace : process.cwd();
    const locale = await osLocale_1.default();
    const rules = await rule_1.getRuleModules();
    const ruleset = await ruleset_1.default.create(workspace, rules);
    const core = new core_1.default(html, ruleset, locale);
    return await core.verify();
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
    const core = new core_1.default(html, ruleset, locale);
    const reports = await core.verify();
    return {
        html,
        reports,
    };
}
exports.verifyFile = verifyFile;
