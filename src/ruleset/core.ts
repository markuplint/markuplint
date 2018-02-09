import deepAssign from 'deep-assign';

import Document from '../dom/document';
import Messenger from '../locale/messenger';
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

export interface ResultResolver {
	ruleConfig: ConfigureFileJSON | null;
	ruleFilePath: string;
}

export default abstract class Ruleset {

	public static readonly NOFILE = '<no-file>';

	public rules: ConfigureFileJSONRules = {};
	public nodeRules: NodeRule[] = [];
	public childNodeRules: NodeRule[] = [];

	private _rules: CustomRule[];
	private _rawConfig: ConfigureFileJSON | null = null;

	constructor (rules: CustomRule[]) {
		this._rules = rules;
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
			await this._extendsRules(this._rawConfig.extends, configFilePath);
		}
	}

	public async verify (nodeTree: Document<null, {}>, messenger: Messenger) {
		const reports: VerifiedResult[] = [];
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

	public abstract async resolver (extendRule: string, baseRuleFilePath: string): Promise<ResultResolver>;

	/**
	 * Recursive loading extends rules
	 *
	 * @param extendRules value of `extends` property
	 */
	private async _extendsRules (extendRules: string | string[], baseRuleFilePath: string) {
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
				this.rules = deepAssign(this.rules, ruleConfig.rules);
			}
			if (ruleConfig.nodeRules) {
				this.nodeRules = deepAssign(this.nodeRules, ruleConfig.nodeRules);
			}
			if (ruleConfig.extends) {
				await this._extendsRules(ruleConfig.extends, ruleFilePath);
			}
		}
	}
}
