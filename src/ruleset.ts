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
	roles: string[] | NodeRuleRoleConditions[] | null;
	obsolete: boolean;
}

export interface NodeRuleRoleConditions {
	role: string;
	attrConditions: NodeRuleAttrCondition[];
}

export interface NodeRuleAttrCondition {
	attrName: string;

	/**
	 * Enumerated values
	 */
	values: string[];
}

/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {

	public static readonly NOFILE = '<no-file>';

	public static async create (config: ConfigureFileJSON | string, rules: Rule[]) {
		const ruleset = new Ruleset(rules);
		if (typeof config === 'string') {
			await ruleset.loadRC(config);
		} else {
			await ruleset.setConfig(config, Ruleset.NOFILE);
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
		// console.log(`search rc file on "${configDir}"`);
		const data = await explorer.load(configDir);
		if (!data || !data.config) {
			throw new Error('markuplint rc file not found');
		}
		const filepath: string = data.filepath;
		// console.log(`Loaded: ${filepath}`);
		const config: ConfigureFileJSON = data.config;
		await this.setConfig(config, filepath);
	}

	/**
	 * @param config JSON Data
	 */
	public async setConfig (config: ConfigureFileJSON, configFilePath: string) {
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

/**
 * Recursive loading extends rules
 *
 * @param extendRules value of `extends` property
 * @param ruleset Ruleset instance
 */
async function extendsRules (extendRules: string | string[], baseRuleFilePath: string, ruleset: Ruleset) {
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
async function extendsRuleResolver (extendRule: string, baseRuleFilePath: string) {
	let jsonStr: string;
	let ruleFilePath: string;
	if (/^markuplint\/[a-z0-9-]+(?:\.json)?$/.test(extendRule)) {
		const matched = extendRule.match(/^markuplint\/([a-z0-9-]+)(?:\.json)?$/);
		if (!matched || !matched[1]) {
			throw new Error(`Invalid rule name set extends "${extendRule}" in markuplint`);
		}
		const id = matched[1];
		const filePath = path.join(__dirname, '..', 'rulesets', `${id}.json`);
		jsonStr = await readFile(filePath, 'utf-8');
		ruleFilePath = filePath;
	} else if (/^(?:https?:)?\/\//.test(extendRule)) {
		// TODO: fetch from internet
		throw new Error(`Unsupported external network. Can not fetch ${extendRule}`);
	} else {
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
		} catch (err) {
			throw new Error(`Extended rc file "${filePath}" is not found`);
		}
	}

	const ruleConfig: ConfigureFileJSON = JSON.parse(jsonStr);
	return { ruleConfig, ruleFilePath };
}
