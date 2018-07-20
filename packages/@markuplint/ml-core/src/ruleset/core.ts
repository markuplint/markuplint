// import deepAssign from 'deep-assign';
import {
	ChildNodeRule,
	Config,
	NodeRule,
	Rules,
	RuleConfig,
	RuleConfigOptions,
	RuleConfigValue,
} from '@markuplint/ml-config';

// import Document from '../dom/document';
// import Messenger from '../locale/messenger';
// import CustomRule from '../rule/custom-rule';

// import { VerifiedResult } from '../rule';

// import { ConfigureFileJSON, ConfigureFileJSONRules, NodeRule } from './JSONInterface';

// export interface ResultResolver {
// 	ruleConfig: ConfigureFileJSON | null;
// 	ruleFilePath: string;
// }

import Messenger from '../locale/messenger';
import Document from '../ml-dom/document';

export default class Ruleset {
	// 	public static readonly NOFILE = '<no-file>';
	public readonly rules: Readonly<Rules>;
	public readonly nodeRules: ReadonlyArray<NodeRule>;
	public readonly childNodeRules: ReadonlyArray<ChildNodeRule>;
	// 	private _rules: CustomRule[];
	// 	private _rawConfig: ConfigureFileJSON | null = null;
	constructor(config: Config) {
		// TODO: deep freeze
		this.rules = Object.freeze(config.rules || {});
		this.nodeRules = Object.freeze(config.nodeRules || []);
		this.childNodeRules = Object.freeze(config.childNodeRules || []);
	}
	// 	/**
	// 	 * @param config JSON Data
	// 	 */
	// 	public async setConfig(config: ConfigureFileJSON, configFilePath: string) {
	// 		this._rawConfig = config;
	// 		if (this._rawConfig.rules) {
	// 			this.rules = this._rawConfig.rules;
	// 		}
	// 		if (this._rawConfig.nodeRules) {
	// 			this.nodeRules = this._rawConfig.nodeRules;
	// 		}
	// 		if (this._rawConfig.childNodeRules) {
	// 			this.childNodeRules = this._rawConfig.childNodeRules;
	// 		}
	// 		if (this._rawConfig.extends) {
	// 			await this._extendsRules(this._rawConfig.extends, configFilePath);
	// 		}
	// 	}
	public async verify(document: Document<RuleConfigValue, RuleConfigOptions>, messenger: Messenger) {
		// const reports: VerifiedResult[] = [];
		// for (const rule of this._rules) {
		// 	const config = rule.optimizeOption(this.rules[rule.name] || false);
		// 	if (config.disabled) {
		// 		continue;
		// 	}
		// 	const results = await rule.verify(document, config, this, messenger);
		// 	reports.push(...results);
		// }
		// return reports;
	}

	public async fix(document: Document<RuleConfigValue, RuleConfigOptions>) {
		// for (const rule of this._rules) {
		// 	const config = rule.optimizeOption(this.rules[rule.name] || false);
		// 	if (config.disabled) {
		// 		continue;
		// 	}
		// 	await rule.fix(document, config, this);
		// }
		// return document.fix();
	}
	// 	public abstract async resolver(extendRule: string, baseRuleFilePath: string): Promise<ResultResolver>;
	// 	/**
	// 	 * Recursive loading extends rules
	// 	 *
	// 	 * @param extendRules value of `extends` property
	// 	 */
	// 	private async _extendsRules(extendRules: string | string[], baseRuleFilePath: string) {
	// 		const extendRuleList = Array.isArray(extendRules) ? extendRules : [extendRules];
	// 		for (const extendRule of extendRuleList) {
	// 			if (!extendRule || !extendRule.trim()) {
	// 				continue;
	// 			}
	// 			const { ruleConfig, ruleFilePath } = await this.resolver(extendRule, baseRuleFilePath);
	// 			if (!ruleConfig) {
	// 				return;
	// 			}
	// 			if (ruleConfig.rules) {
	// 				this.rules = deepAssign(this.rules, ruleConfig.rules);
	// 			}
	// 			if (ruleConfig.nodeRules) {
	// 				this.nodeRules = [...this.nodeRules, ...ruleConfig.nodeRules];
	// 			}
	// 			if (ruleConfig.childNodeRules) {
	// 				this.childNodeRules = [...this.childNodeRules, ...ruleConfig.childNodeRules];
	// 			}
	// 			if (ruleConfig.extends) {
	// 				await this._extendsRules(ruleConfig.extends, ruleFilePath);
	// 			}
	// 		}
	// 	}
}
