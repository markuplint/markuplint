"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
// TODO: @types
// @ts-ignore
const cosmiconfig = require("cosmiconfig");
const deepAssign = require("deep-assign");
const explorer = cosmiconfig('markuplint');
const rule_1 = require("./rule");
const readFile = util.promisify(fs.readFile);
/**
 * TODO: Isolate API that between constractor and file I/O.
 */
class Ruleset {
    constructor(rules) {
        this.rules = {};
        this.nodeRules = [];
        this._rawConfig = null;
        this._rules = rules;
    }
    static async create(config, rules) {
        const ruleset = new Ruleset(rules);
        if (typeof config === 'string') {
            await ruleset.loadRC(config);
        }
        else {
            await ruleset.setConfig(config);
        }
        return ruleset;
    }
    async loadRC(configDir) {
        const data = await explorer.load(configDir);
        const filepath = data.filepath;
        // console.log(`Loaded: ${filepath}`);
        const config = data.config;
        if (config) {
            await this.setConfig(config);
        }
        else {
            console.warn(`markuplint rc file not found.`);
        }
    }
    /**
     * TODO: Recursive fetch
     *
     * @param config JSON Data
     */
    async setConfig(config) {
        this._rawConfig = config;
        if (this._rawConfig.rules) {
            this.rules = this._rawConfig.rules;
        }
        if (this._rawConfig.nodeRules) {
            this.nodeRules = this._rawConfig.nodeRules;
        }
        if (this._rawConfig.extends) {
            const extendRuleList = Array.isArray(this._rawConfig.extends) ? this._rawConfig.extends : [this._rawConfig.extends];
            for (const extendRule of extendRuleList) {
                if (!extendRule || !extendRule.trim()) {
                    continue;
                }
                const rulePath = path.resolve(`${extendRule}.json`);
                const ruleJSON = await readFile(rulePath, 'utf-8');
                const ruleConfig = JSON.parse(ruleJSON);
                if (ruleConfig.rules) {
                    this.rules = deepAssign(this.rules, ruleConfig.rules);
                }
                if (ruleConfig.nodeRules) {
                    this.nodeRules = deepAssign(this.nodeRules, ruleConfig.nodeRules);
                }
            }
        }
    }
    async verify(nodeTree, locale) {
        const reports = [];
        for (const rule of this._rules) {
            const config = rule.optimizeOption(this.rules[rule.name] || false);
            if (config.disabled) {
                continue;
            }
            let results;
            if (rule instanceof rule_1.CustomRule) {
                results = await rule.verify(nodeTree, config, this, locale);
            }
            else {
                const verifyReturns = await rule.verify(nodeTree, config, this, locale);
                results = verifyReturns.map((v) => Object.assign(v, { ruleId: rule.name }));
            }
            reports.push(...results);
        }
        return reports;
    }
}
exports.default = Ruleset;
