import type { ChildNodeRule, Config, NodeRule, Rules } from '@markuplint/ml-config';

/**
 * A resolved set of rules, node-specific rule overrides, and child-node-specific
 * rule overrides extracted from a markuplint {@link Config}.
 */
export class Ruleset {
	/**
	 * Maps base rule names to the virtual rule names created by top-level `rules`
	 * NamedRuleGroups (e.g. `"a11y/landmark-roles": { rules: { "no-nested-top-level-landmark": true } }`).
	 * These wrappers have no selector scope of their own — they mirror the base rule
	 * globally — so nodeRules/childNodeRules may propagate *any* matched value to them,
	 * not just a disable.
	 */
	readonly baseRuleToVirtualNames: ReadonlyMap<string, readonly string[]>;
	/**
	 * Maps base rule names to the virtual rule names created by `nodeRules[].name` /
	 * `childNodeRules[].name` (selector-scoped named groups), as opposed to
	 * {@link baseRuleToVirtualNames}'s top-level `rules` groups. Because these wrappers
	 * DO have their own selector scope, only a disable (`false`) may be propagated to
	 * them from an unrelated nodeRules/childNodeRules entry — forwarding a non-false
	 * value would apply the wrapper's semantics to nodes its own selector never matched
	 * (see issue #4023's fix history).
	 */
	readonly baseRuleToScopedVirtualNames: ReadonlyMap<string, readonly string[]>;
	/** Rule overrides that apply to child nodes matching specific selectors */
	readonly childNodeRules: readonly ChildNodeRule[];
	/**
	 * `rules` keys that are a genuine NamedRuleGroup in some layer of the
	 * `extends`/override chain, carried over from {@link Config.knownNamedRuleGroupKeys}
	 * even where the final merged value collapsed to `false`. See that field's JSDoc.
	 */
	readonly knownNamedRuleGroupKeys: ReadonlySet<string>;
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
	 * @param baseRuleToVirtualNames - Mapping from base rule names to top-level-group virtual rule names
	 * @param baseRuleToScopedVirtualNames - Mapping from base rule names to selector-scoped (nodeRules/childNodeRules) virtual rule names
	 */
	constructor(
		config: Config,
		baseRuleToVirtualNames?: ReadonlyMap<string, readonly string[]>,
		baseRuleToScopedVirtualNames?: ReadonlyMap<string, readonly string[]>,
	) {
		this.rules = config.rules ?? {};
		this.nodeRules = config.nodeRules ?? [];
		this.childNodeRules = config.childNodeRules ?? [];
		this.baseRuleToVirtualNames = baseRuleToVirtualNames ?? new Map();
		this.baseRuleToScopedVirtualNames = baseRuleToScopedVirtualNames ?? new Map();
		this.knownNamedRuleGroupKeys = new Set(config.knownNamedRuleGroupKeys);
	}
}
