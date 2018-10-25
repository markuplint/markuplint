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
}
