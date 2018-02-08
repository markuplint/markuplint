"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const deep_assign_1 = __importDefault(require("deep-assign"));
const extendsRuleResolver_1 = __importDefault(require("./extendsRuleResolver"));
/**
 * Recursive loading extends rules
 *
 * @param extendRules value of `extends` property
 * @param ruleset Ruleset instance
 */
async function extendsRules(extendRules, baseRuleFilePath, ruleset) {
    const extendRuleList = Array.isArray(extendRules) ? extendRules : [extendRules];
    for (const extendRule of extendRuleList) {
        if (!extendRule || !extendRule.trim()) {
            continue;
        }
        const { ruleConfig, ruleFilePath } = await extendsRuleResolver_1.default(extendRule, baseRuleFilePath);
        if (!ruleConfig) {
            return;
        }
        if (ruleConfig.rules) {
            ruleset.rules = deep_assign_1.default(ruleset.rules, ruleConfig.rules);
        }
        if (ruleConfig.nodeRules) {
            ruleset.nodeRules = deep_assign_1.default(ruleset.nodeRules, ruleConfig.nodeRules);
        }
        if (ruleConfig.extends) {
            await extendsRules(ruleConfig.extends, ruleFilePath, ruleset);
        }
    }
}
exports.default = extendsRules;
