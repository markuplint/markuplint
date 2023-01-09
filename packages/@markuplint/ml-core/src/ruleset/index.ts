import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

export class Ruleset {
	readonly childNodeRules: ReadonlyArray<ChildNodeRule>;
	readonly nodeRules: ReadonlyArray<NodeRule>;
	readonly rules: Readonly<Rules>;

	constructor(config: Config) {
		// TODO: deep freeze
		this.rules = Object.freeze(config.rules || {});
		this.nodeRules = Object.freeze(config.nodeRules || []);
		this.childNodeRules = Object.freeze(config.childNodeRules || []);
	}
}
