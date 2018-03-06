"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const core_1 = __importDefault(require("./core"));
const originRoot = 'https://raw.githubusercontent.com/YusukeHirao/markuplint/master/';
class RulesetForClient extends core_1.default {
    async resolver(extendRule, baseRuleFilePath) {
        let url;
        if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
            const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
            if (!matched || !matched[1]) {
                throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
            }
            const id = matched[1];
            const filePath = path_1.default.join(originRoot, 'rulesets', `${id}.json`);
            url = new URL(filePath).toString();
        }
        else if (/^(?:https?:)?\/\//.test(extendRule)) {
            url = new URL(extendRule).toString();
        }
        else {
            if (baseRuleFilePath === core_1.default.NOFILE) {
                return {
                    ruleConfig: null,
                    ruleFilePath: core_1.default.NOFILE,
                };
            }
            url = new URL(extendRule, baseRuleFilePath).toString();
        }
        const res = await fetch(url.toString(), { mode: 'cors' });
        const ruleConfig = await res.json();
        return { ruleConfig, ruleFilePath: url };
    }
}
RulesetForClient.NOFILE = '<no-file>';
exports.default = RulesetForClient;
