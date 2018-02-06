"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const core_1 = __importDefault(require("./core"));
const loader_1 = __importDefault(require("./rule/loader"));
const ruleset_1 = __importDefault(require("./ruleset"));
const osLocale_1 = __importDefault(require("./util/osLocale"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
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
    const rules = await loader_1.default();
    const ruleset = await ruleset_1.default.create(workspace, rules);
    const core = new core_1.default(html, ruleset, locale);
    return await core.verify();
}
exports.verifyOnWorkspace = verifyOnWorkspace;
async function verifyFile(filePath, rules, configFileOrDir, locale) {
    if (!locale) {
        locale = await osLocale_1.default();
    }
    rules = rules || await loader_1.default();
    let ruleset;
    if (configFileOrDir) {
        ruleset = await ruleset_1.default.create(configFileOrDir, rules);
    }
    else {
        const absFilePath = path_1.default.resolve(filePath);
        const parsedPath = path_1.default.parse(absFilePath);
        const dir = path_1.default.dirname(absFilePath);
        ruleset = await ruleset_1.default.create(dir, rules);
    }
    const html = await readFile(filePath, 'utf-8');
    const core = new core_1.default(html, ruleset, locale);
    const reports = await core.verify();
    return {
        html,
        reports,
    };
}
exports.verifyFile = verifyFile;
