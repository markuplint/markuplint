import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

export default class Ruleset {
	readonly rules: Readonly<Rules>;
	readonly nodeRules: ReadonlyArray<NodeRule>;
	readonly childNodeRules: ReadonlyArray<ChildNodeRule>;

	constructor(config: Config) {
		// TODO: deep freeze
		this.rules = Object.freeze(config.rules || {});
		this.nodeRules = Object.freeze(config.nodeRules || []);
		this.childNodeRules = Object.freeze(config.childNodeRules || []);
	}
}
