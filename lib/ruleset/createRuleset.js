"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const searchAndLoad_1 = __importDefault(require("./searchAndLoad"));
const _1 = __importDefault(require("./"));
async function createRuleset(config, rules) {
    const ruleset = new _1.default(rules);
    if (typeof config === 'string') {
        await loadRC(ruleset, config);
    }
    else {
        await ruleset.setConfig(config, _1.default.NOFILE);
    }
    return ruleset;
}
exports.default = createRuleset;
async function loadRC(ruleset, fileOrDir) {
    const { filePath, config } = await searchAndLoad_1.default(fileOrDir);
    await ruleset.setConfig(config, filePath);
}
