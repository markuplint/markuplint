import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

/**
 * A resolved set of rules, node-specific rule overrides, and child-node-specific
 * rule overrides extracted from a markuplint {@link Config}.
 */
export class Ruleset {
	/** Rule overrides that apply to child nodes matching specific selectors */
	readonly childNodeRules: readonly ChildNodeRule[];
	/** Rule overrides that apply to nodes matching specific selectors */
	readonly nodeRules: readonly NodeRule[];
	/** The global rule definitions */
	readonly rules: Rules;

	/**
	 * @param config - The markuplint configuration to extract rules from
	 */
	constructor(config: Config) {
		this.rules = config.rules ?? {};
		this.nodeRules = config.nodeRules ?? [];
		this.childNodeRules = config.childNodeRules ?? [];
	}
}
