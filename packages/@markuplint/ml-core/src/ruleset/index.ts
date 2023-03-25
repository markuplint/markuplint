import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

export default class Ruleset {
	readonly childNodeRules: readonly ChildNodeRule[];
	readonly nodeRules: readonly NodeRule[];
	readonly rules: Rules;

	constructor(config: Config) {
		this.rules = config.rules ?? {};
		this.nodeRules = config.nodeRules ?? [];
		this.childNodeRules = config.childNodeRules ?? [];
	}
}
