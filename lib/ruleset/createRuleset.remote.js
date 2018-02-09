"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const remote_1 = __importDefault(require("./remote"));
async function createRuleset(config, rules) {
    const ruleset = new remote_1.default(rules);
    if (typeof config === 'string') {
        await loadRC(ruleset, config);
    }
    else {
        await ruleset.setConfig(config, remote_1.default.NOFILE);
    }
    return ruleset;
}
exports.default = createRuleset;
async function loadRC(ruleset, fileOrDir) {
    const { ruleConfig, ruleFilePath } = await ruleset.resolver(fileOrDir, location.href);
    if (ruleConfig) {
        await ruleset.setConfig(ruleConfig, ruleFilePath);
    }
}
