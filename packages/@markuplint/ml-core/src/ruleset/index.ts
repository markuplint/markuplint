import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

/**
 * A resolved set of rules, node-specific rule overrides, and child-node-specific
 * rule overrides extracted from a markuplint {@link Config}.
 */
export class Ruleset {
	/**
	 * Maps base rule names to their virtual rule names created by NamedRuleGroups.
	 * For example, if `a11y/landmark-roles` wraps `no-nested-top-level-landmark`, this maps
	 * `"no-nested-top-level-landmark"` → `["a11y/landmark-roles"]`.
	 * Used by nodeRules/childNodeRules to propagate settings to virtual rules.
	 */
	readonly baseRuleToVirtualNames: ReadonlyMap<string, readonly string[]>;
	/** Rule overrides that apply to child nodes matching specific selectors */
	readonly childNodeRules: readonly ChildNodeRule[];
	/**
	 * Errors collected during rule mapping (e.g., invalid wildcard usage).
	 * Consumed by MLCore and reported as config-error violations.
	 */
	readonly mappingErrors: Error[] = [];
	/** Rule overrides that apply to nodes matching specific selectors */
	readonly nodeRules: readonly NodeRule[];
	/** The global rule definitions */
	readonly rules: Rules;

	/**
	 * @param config - The markuplint configuration to extract rules from
	 * @param baseRuleToVirtualNames - Mapping from base rule names to virtual rule names
	 */
	constructor(config: Config, baseRuleToVirtualNames?: ReadonlyMap<string, readonly string[]>) {
		this.rules = config.rules ?? {};
		this.nodeRules = config.nodeRules ?? [];
		this.childNodeRules = config.childNodeRules ?? [];
		this.baseRuleToVirtualNames = baseRuleToVirtualNames ?? new Map();
	}
}
