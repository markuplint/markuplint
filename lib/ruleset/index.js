"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const core_1 = __importDefault(require("./core"));
const readTextFile_1 = __importDefault(require("../util/readTextFile"));
class RulesetForNodeJS extends core_1.default {
    async resolver(extendRule, baseRuleFilePath) {
        let jsonStr;
        let ruleFilePath;
        if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
            const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
            if (!matched || !matched[1]) {
                throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
            }
            const id = matched[1];
            const filePath = path_1.default.join(__dirname, '..', '..', 'rulesets', `${id}.json`);
            jsonStr = await readTextFile_1.default(filePath);
            ruleFilePath = filePath;
        }
        else if (/^(?:https?:)?\/\//.test(extendRule)) {
            // TODO: fetch from internet
            throw new Error(`Unsupported external network. Can not fetch ${extendRule}`);
        }
        else {
            if (baseRuleFilePath === core_1.default.NOFILE) {
                return {
                    ruleConfig: null,
                    ruleFilePath: core_1.default.NOFILE,
                };
            }
            const dir = path_1.default.dirname(baseRuleFilePath);
            const filePath = path_1.default.resolve(path_1.default.join(dir, extendRule));
            try {
                jsonStr = await readTextFile_1.default(filePath);
                ruleFilePath = filePath;
            }
            catch (err) {
                throw new Error(`Extended rc file "${filePath}" is not found`);
            }
        }
        const ruleConfig = JSON.parse(jsonStr);
        return { ruleConfig, ruleFilePath };
    }
}
RulesetForNodeJS.NOFILE = '<no-file>';
exports.default = RulesetForNodeJS;
