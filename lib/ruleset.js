"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
// TODO: @types
// @ts-ignore
const cosmiconfig = require("cosmiconfig");
const explorer = cosmiconfig('markuplint');
const rule_1 = require("./rule");
const readFile = util.promisify(fs.readFile);
class Ruleset {
    constructor(rules) {
        this._rawConfig = null;
        this._rules = rules;
    }
    static async create(config, rules) {
        const ruleset = new Ruleset(rules);
        if (typeof config === 'string') {
            await ruleset.loadConfig(config);
        }
        else {
            await ruleset.setConfig(config);
        }
        return ruleset;
    }
    async loadConfig(configDir) {
        const data = await explorer.load(configDir);
        const filepath = data.filepath;
        console.log(`Loaded: ${filepath}`);
        const config = data.config;
        if (config) {
            await this.setConfig(config);
        }
        else {
            console.warn(`markuplint rc file not found.`);
        }
    }
    async setConfig(config) {
        this._rawConfig = config;
        this.rules = this._rawConfig.rules;
    }
    async verify(nodeTree, locale) {
        const reports = [];
        for (const rule of this._rules) {
            if (this.rules && this.rules[rule.name]) {
                const config = rule.optimizeOption(this.rules[rule.name]);
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
        }
        return reports;
    }
}
exports.default = Ruleset;
