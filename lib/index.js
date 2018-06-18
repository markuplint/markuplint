"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const core_1 = __importDefault(require("./core"));
const loader_1 = __importDefault(require("./rule/loader"));
const node_1 = __importDefault(require("./locale/messenger/node"));
const createRuleset_1 = __importDefault(require("./ruleset/createRuleset"));
const is_remote_file_1 = __importDefault(require("./util/is-remote-file"));
const resolve_file_1 = require("./util/resolve-file");
async function verify(html, config, rules, locale) {
    const ruleset = await createRuleset_1.default(config, rules);
    const core = new core_1.default(html, ruleset, await node_1.default(locale));
    return await core.verify();
}
exports.verify = verify;
async function fix(html, config, rules, locale) {
    const ruleset = await createRuleset_1.default(config, rules);
    const core = new core_1.default(html, ruleset, await node_1.default(locale));
    return await core.fix();
}
exports.fix = fix;
async function verifyOnWorkspace(html, workspace) {
    workspace = workspace ? workspace : process.cwd();
    const rules = await loader_1.default();
    const ruleset = await createRuleset_1.default(workspace, rules);
    const core = new core_1.default(html, ruleset, await node_1.default());
    return await core.verify();
}
exports.verifyOnWorkspace = verifyOnWorkspace;
async function fixOnWorkspace(html, workspace) {
    workspace = workspace ? workspace : process.cwd();
    const rules = await loader_1.default();
    const ruleset = await createRuleset_1.default(workspace, rules);
    const core = new core_1.default(html, ruleset, await node_1.default());
    return await core.fix();
}
exports.fixOnWorkspace = fixOnWorkspace;
async function verifyFile(filePath, rules, configFileOrDir, locale) {
    const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
    const reports = await core.verify();
    return {
        html: core.rawHTML,
        reports,
    };
}
exports.verifyFile = verifyFile;
async function fixFile(filePath, rules, configFileOrDir, locale) {
    const core = await resolveLinter(filePath, rules, configFileOrDir, locale);
    const fixed = await core.fix();
    return {
        origin: core.rawHTML,
        fixed,
    };
}
exports.fixFile = fixFile;
async function resolveLinter(filePath, rules, configFileOrDir, locale) {
    rules = rules || (await loader_1.default());
    let ruleset;
    if (configFileOrDir) {
        ruleset = await createRuleset_1.default(configFileOrDir, rules);
    }
    else {
        let dir;
        if (is_remote_file_1.default(filePath)) {
            dir = process.cwd();
        }
        else {
            const absFilePath = path_1.default.resolve(filePath);
            const parsedPath = path_1.default.parse(absFilePath);
            dir = path_1.default.dirname(absFilePath);
        }
        ruleset = await createRuleset_1.default(dir, rules);
    }
    const html = await resolve_file_1.resolveFile(filePath);
    const core = new core_1.default(html, ruleset, await node_1.default(locale));
    return core;
}
