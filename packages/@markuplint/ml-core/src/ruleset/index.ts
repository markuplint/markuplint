import {
	ChildNodeRule,
	Config,
	NodeRule,
	Rules,
	RuleConfig,
	RuleConfigOptions,
	RuleConfigValue,
} from '@markuplint/ml-config/';

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
}
