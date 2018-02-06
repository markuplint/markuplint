import fs from 'fs';
import path from 'path';
import util from 'util';

import deepAssign from 'deep-assign';

import Document from '../dom/document';
import CustomRule from '../rule/custom-rule';

import {
	RuleConfig,
	Severity,
	VerifiedResult,
	VerifyReturn,
} from '../rule';

import {
	ConfigureFileJSON,
	ConfigureFileJSONRules,
	NodeRule,
} from './JSONInterface';

import { searchAndLoad } from './loader';

import fileSearch from '../util/fileSearch';

const readFile = util.promisify(fs.readFile);

/**
 * TODO: Isolate API that between constractor and file I/O.
 */
export default class Ruleset {

	public static readonly NOFILE = '<no-file>';

	public static async create (config: ConfigureFileJSON | string, rules: CustomRule[]) {
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
	public childNodeRules: NodeRule[] = [];

	private _rules: CustomRule[];
	private _rawConfig: ConfigureFileJSON | null = null;

	private constructor (rules: CustomRule[]) {
		this._rules = rules;
	}

	public async loadRC (fileOrDir: string) {
		const { filePath, config } = await searchAndLoad(fileOrDir);
		await this.setConfig(config, filePath);
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
		if (this._rawConfig.childNodeRules) {
			this.childNodeRules = this._rawConfig.childNodeRules;
		}
		if (this._rawConfig.extends) {
			await extendsRules(this._rawConfig.extends, configFilePath, this);
		}
	}

	public async verify (nodeTree: Document<null, {}>, locale: string) {
		const reports: VerifiedResult[] = [];
		for (const rule of this._rules) {
			const config = rule.optimizeOption(this.rules[rule.name] || false);
			if (config.disabled) {
				continue;
			}
			const results = await rule.verify(nodeTree, config, this, locale);
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
		const filePath = path.join(__dirname, '..', '..', 'rulesets', `${id}.json`);
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
