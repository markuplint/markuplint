"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
}
Object.defineProperty(exports, "__esModule", { value: true });
const deep_assign_1 = __importDefault(require("deep-assign"));
class Ruleset {
    constructor(rules) {
        this.rules = {};
        this.nodeRules = [];
        this.childNodeRules = [];
        this._rawConfig = null;
        this._rules = rules;
    }
    /**
     * @param config JSON Data
     */
    async setConfig(config, configFilePath) {
        this._rawConfig = config;
        if (this._rawConfig.rules) {
            this.rules = this._rawConfig.rules;
        }
        if (this._rawConfig.nodeRules) {
            this.nodeRules = this._rawConfig.nodeRules;
        }
        if (this._rawConfig.childNodeRules) {
            this.childNodeRules = this._rawConfig.childNodeRules;
        }
        if (this._rawConfig.extends) {
            await this._extendsRules(this._rawConfig.extends, configFilePath);
        }
    }
    async verify(nodeTree, messenger) {
        const reports = [];
        for (const rule of this._rules) {
            const config = rule.optimizeOption(this.rules[rule.name] || false);
            if (config.disabled) {
                continue;
            }
            const results = await rule.verify(nodeTree, config, this, messenger);
            reports.push(...results);
        }
        return reports;
    }
    /**
     * Recursive loading extends rules
     *
     * @param extendRules value of `extends` property
     */
    async _extendsRules(extendRules, baseRuleFilePath) {
        const extendRuleList = Array.isArray(extendRules) ? extendRules : [extendRules];
        for (const extendRule of extendRuleList) {
            if (!extendRule || !extendRule.trim()) {
                continue;
            }
            const { ruleConfig, ruleFilePath } = await this.resolver(extendRule, baseRuleFilePath);
            if (!ruleConfig) {
                return;
            }
            if (ruleConfig.rules) {
                this.rules = deep_assign_1.default(this.rules, ruleConfig.rules);
            }
            if (ruleConfig.nodeRules) {
                this.nodeRules = deep_assign_1.default(this.nodeRules, ruleConfig.nodeRules);
            }
            if (ruleConfig.extends) {
                await this._extendsRules(ruleConfig.extends, ruleFilePath);
            }
        }
    }
}
Ruleset.NOFILE = '<no-file>';
exports.default = Ruleset;
