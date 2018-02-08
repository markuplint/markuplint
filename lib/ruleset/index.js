"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
            // await extendsRules(this._rawConfig.extends, configFilePath, this);
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
}
Ruleset.NOFILE = '<no-file>';
exports.default = Ruleset;
