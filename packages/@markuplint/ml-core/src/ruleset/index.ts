import { ChildNodeRule, Config, NodeRule, Rule, Rules } from '@markuplint/ml-config/';

export default class Ruleset {
	public readonly rules: Readonly<Rules>;
	public readonly nodeRules: ReadonlyArray<NodeRule>;
	public readonly childNodeRules: ReadonlyArray<ChildNodeRule>;

	constructor(config: Config) {
		// TODO: deep freeze
		this.rules = Object.freeze(config.rules || {});
		this.nodeRules = Object.freeze(config.nodeRules || []);
		this.childNodeRules = Object.freeze(config.childNodeRules || []);
	}

	public eachRules(callback: (ruleName: string, rule: Rule) => void) {
		for (const ruleName in this.rules) {
			if (this.rules.hasOwnProperty(ruleName)) {
				const rule = this.rules[ruleName];
				callback(ruleName, rule);
			}
		}
	}

	public eachNodeRules(callback: (selector: string, ruleName: string, rule: Rule) => void) {
		for (const nodeRule of this.nodeRules) {
			if (!nodeRule.rules || !nodeRule.selector) {
				return;
			}
			for (const ruleName of Object.keys(nodeRule.rules)) {
				const rule = nodeRule.rules[ruleName];
				callback(nodeRule.selector, ruleName, rule);
			}
		}
	}

	public eachChildNodeRules(
		callback: (selector: string, ruleName: string, rule: Rule, inheritance: boolean) => void,
	) {
		for (const nodeRule of this.childNodeRules) {
			if (!nodeRule.rules || !nodeRule.selector) {
				return;
			}
			for (const ruleName in nodeRule.rules) {
				if (nodeRule.hasOwnProperty(ruleName)) {
					const rule = nodeRule.rules[ruleName];
					callback(nodeRule.selector, ruleName, rule, !!nodeRule.inheritance);
				}
			}
		}
	}
}
