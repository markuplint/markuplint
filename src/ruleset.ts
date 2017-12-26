import * as fs from 'fs';
import * as util from 'util';

// TODO: @types
// @ts-ignore
import * as cosmiconfig from 'cosmiconfig';

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

export type PermittedContent = [string, PermittedContentOptions | undefined];

export interface NodeRule {
	nodeType: string;
	permittedContent: PermittedContent[];
	attributes: {[attrName: string]: any }; // tslint:disable-line:no-any
	inheritance: boolean;
}

/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {

	public static async create (config: ConfigureFileJSON | string, rules: Rule[]) {
		const ruleset = new Ruleset(rules);
		if (typeof config === 'string') {
			await ruleset.loadConfig(config);
		} else {
			await ruleset.setConfig(config);
		}
		return ruleset;
	}

	public rules: ConfigureFileJSONRules;
	public nodeRules?: NodeRule[];

	private _rules: Rule[];
	private _rawConfig: ConfigureFileJSON | null = null;

	private constructor (rules: Rule[]) {
		this._rules = rules;
	}

	public async loadConfig (configDir: string) {
		const data = await explorer.load(configDir);
		const filepath: string = data.filepath;
		console.log(`Loaded: ${filepath}`);
		const config: ConfigureFileJSON = data.config;
		if (config) {
			await this.setConfig(config);
		} else {
			console.warn(`markuplint rc file not found.`);
		}
	}

	public async setConfig (config: ConfigureFileJSON) {
		this._rawConfig = config;
		this.rules = this._rawConfig.rules;
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
