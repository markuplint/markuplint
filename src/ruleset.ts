import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

// TODO: @types
// @ts-ignore
import * as cosmiconfig from 'cosmiconfig';

import * as deepAssign from 'deep-assign';

const explorer = cosmiconfig('markuplint');

import {
	Document,
} from './parser';

import Rule, {
	CustomRule,
	RuleConfig,
	RuleLevel,
	VerifiedResult,
	VerifyReturn,
} from './rule';

import fileSearch from './util/fileSearch';

const readFile = util.promisify(fs.readFile);

export interface PermittedContentOptions {
	required?: boolean;
	times?: 'once' | 'zero or more' | 'one or more' | 'any';
}

export interface ConfigureFileJSON {
	extends?: string | string[];
	rules: ConfigureFileJSONRules;
	nodeRules?: NodeRule[];
}

export interface ConfigureFileJSONRules {
	[ruleName: string]: boolean | ConfigureFileJSONRuleOption<null, {}>;
}

export type ConfigureFileJSONRuleOption<T, O> = [RuleLevel, T, O];

export interface NodeRule {
	tagName: string;
	categories: string[];
	roles: string[];
	obsolete: boolean;
}

/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {

	public static async create (config: ConfigureFileJSON | string, rules: Rule[]) {
		const ruleset = new Ruleset(rules);
		if (typeof config === 'string') {
			await ruleset.loadRC(config);
		} else {
			await ruleset.setConfig(config);
		}
		return ruleset;
	}

	public rules: ConfigureFileJSONRules = {};
	public nodeRules: NodeRule[] = [];

	private _rules: Rule[];
	private _rawConfig: ConfigureFileJSON | null = null;
	private _configPath: string;

	private constructor (rules: Rule[]) {
		this._rules = rules;
	}

	public async loadRC (configDir: string) {
		const data = await explorer.load(configDir);
		const filepath: string = data.filepath;
		// console.log(`Loaded: ${filepath}`);
		const config: ConfigureFileJSON = data.config;
		if (config) {
			await this.setConfig(config);
		} else {
			console.warn(`markuplint rc file not found.`);
		}
	}

	/**
	 * TODO: Recursive fetch
	 *
	 * @param config JSON Data
	 */
	public async setConfig (config: ConfigureFileJSON) {
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

	public async verify (nodeTree: Document, locale: string) {
		const reports: VerifiedResult[] = [];
		for (const rule of this._rules) {
			const config = rule.optimizeOption(this.rules[rule.name] || false);
			if (config.disabled) {
				continue;
			}
			let results: VerifiedResult[];
			if (rule instanceof CustomRule) {
				results = await rule.verify(nodeTree, config, this, locale);
			} else {
				const verifyReturns = await rule.verify(nodeTree, config, this, locale);
				results = verifyReturns.map((v) => Object.assign(v, { ruleId: rule.name }));
			}
			reports.push(...results);
		}
		return reports;
	}
}
