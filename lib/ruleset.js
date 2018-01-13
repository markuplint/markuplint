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
    static async _create(config, rules) {
        const ruleset = new Ruleset(rules);
        if (typeof config === 'string') {
            await ruleset.loadRC(config);
        }
        else {
            await ruleset.setConfig(config, Ruleset.NOFILE);
        }
        return ruleset;
    }
    async loadRC(configDir) {
        // console.log(`search rc file on "${configDir}"`);
        const data = await explorer.load(configDir);
        if (!data || !data.config) {
            throw new Error('markuplint rc file not found');
        }
        const filepath = data.filepath;
        // console.log(`Loaded: ${filepath}`);
        const config = data.config;
        await this.setConfig(config, filepath);
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
        if (this._rawConfig.extends) {
            await extendsRules(this._rawConfig.extends, configFilePath, this);
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
Ruleset.NOFILE = '<no-file>';
exports.default = Ruleset;
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
        const { ruleConfig, ruleFilePath } = await extendsRuleResolver(extendRule, baseRuleFilePath);
        if (!ruleConfig) {
            return;
        }
        if (ruleConfig.rules) {
            ruleset.rules = deepAssign(ruleset.rules, ruleConfig.rules);
        }
        if (ruleConfig.nodeRules) {
            ruleset.nodeRules = deepAssign(ruleset.nodeRules, ruleConfig.nodeRules);
        }
        if (ruleConfig.extends) {
            await extendsRules(ruleConfig.extends, ruleFilePath, ruleset);
        }
    }
}
/**
 * TODO: use cosmiconfig?
 * TODO: support YAML
 * TODO: fetch from internet
 *
 * @param extendRule extend rule file
 */
async function extendsRuleResolver(extendRule, baseRuleFilePath) {
    let jsonStr;
    let ruleFilePath;
    if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
        const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
        if (!matched || !matched[1]) {
            throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
        }
        const id = matched[1];
        const filePath = path.join(__dirname, '..', 'rulesets', `${id}.json`);
        jsonStr = await readFile(filePath, 'utf-8');
        ruleFilePath = filePath;
    }
    else if (/^(?:https?:)?\/\//.test(extendRule)) {
        // TODO: fetch from internet
        throw new Error(`Unsupported external network. Can not fetch ${extendRule}`);
    }
    else {
        if (baseRuleFilePath === Ruleset.NOFILE) {
            return {
                ruleConfig: null,
                ruleFilePath: Ruleset.NOFILE,
            };
        }
        const dir = path.dirname(baseRuleFilePath);
        const filePath = path.resolve(path.join(dir, extendRule));
        try {
            jsonStr = await readFile(filePath, 'utf-8');
            ruleFilePath = filePath;
        }
        catch (err) {
            throw new Error(`Extended rc file "${filePath}" is not found`);
        }
    }
    const ruleConfig = JSON.parse(jsonStr);
    return { ruleConfig, ruleFilePath };
}
