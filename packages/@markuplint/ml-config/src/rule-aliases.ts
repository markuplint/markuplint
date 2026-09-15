import type { AnyRule, ChildNodeRule, Config, NodeRule, Rules } from './types.js';

/**
 * Expands a deprecated rule name's resolved configuration into the
 * configuration for each rule that replaced it.
 *
 * Receives the user's fully merged configuration for the deprecated name
 * (after `extends` resolution) and returns a map of new-rule-name → new
 * configuration. A 1:1 rename returns a single entry; a rule that was split
 * returns one entry per successor, and may omit a successor entirely
 * (returning fewer keys than the split has rules) when the old
 * configuration's shape means that successor doesn't apply — e.g. an old
 * boolean sub-option that gated whether a since-split-off check ran at all.
 */
export type RuleAliasEntry = {
	readonly expand: (rule: AnyRule) => Readonly<Record<string, AnyRule>>;
	/**
	 * Every rule name `expand` can possibly return, including ones a given
	 * call might omit conditionally. Purely for the alias table's own
	 * registry test (confirming each name is a real, currently-registered
	 * rule) — `applyRuleAliases` itself never reads this field.
	 */
	readonly targets: readonly string[];
};

/**
 * Maps each deprecated rule name to how it expands into its replacement(s).
 * Keys are the old (pre-v5-redesign) rule names; values describe the new
 * rule(s) it became. Built and consumed by `@markuplint/rules`, which owns
 * the concrete mapping — this module only provides the mechanism.
 */
export type RuleAliasTable = Readonly<Record<string, RuleAliasEntry>>;

/**
 * One deprecated rule name found in a user's configuration, and the rule(s)
 * that now cover what it checked. Surfaced to the caller so it can report a
 * deprecation notice (e.g. as a `config-error`-channel warning) — this
 * module only computes the rewritten config, it does not report anything
 * itself.
 */
export type RuleAliasWarning = {
	readonly deprecatedName: string;
	readonly replacedBy: readonly string[];
};

/**
 * Rewrites deprecated rule names in a resolved `rules` map to their v5
 * replacements, per `table`. Named rule groups (keys containing `/`) are
 * untouched — aliasing only concerns base rule identity, not preset-authored
 * virtual rules, which reference base rules by their *current* name in the
 * preset source.
 *
 * Applied once, after `extends` merging is complete: the input `rules` is
 * the final flat map a `Ruleset` would otherwise consume directly, so this
 * function's output can be substituted for it with no other pipeline change.
 *
 * If the user's configuration sets *both* a deprecated name and one of its
 * replacements, the explicit replacement setting wins — an old alias never
 * overwrites a setting the user wrote under the new name.
 *
 * When two different deprecated names expand into the same replacement
 * (e.g. two rules that were merged into one), their resolved configurations
 * for that replacement are combined with the same right-side-wins semantics
 * `mergeRule` uses elsewhere, ordered by the deprecated names' order in
 * `rules`.
 *
 * Only rewrites the top-level `rules` map. A `nodeRules`/`childNodeRules`
 * entry's own `rules` (always base-rule-only, never a named group) needs the
 * same treatment — see {@link applyRuleAliasesToConfig}, which applies this
 * function to all three locations a rule name can appear in a `Config`.
 */
export function applyRuleAliases(
	rules: Rules | undefined,
	table: RuleAliasTable,
): { readonly rules: Rules | undefined; readonly warnings: readonly RuleAliasWarning[] } {
	if (!rules) {
		return { rules, warnings: [] };
	}

	const warnings: RuleAliasWarning[] = [];
	const named: Record<string, unknown> = {};
	const baseRules: Record<string, AnyRule> = {};

	for (const [key, value] of Object.entries(rules)) {
		if (key.includes('/')) {
			named[key] = value;
		} else {
			baseRules[key] = value as AnyRule;
		}
	}

	const expandedBaseRules = expandBaseRules(baseRules, table, warnings);

	return { rules: { ...expandedBaseRules, ...named } as Rules, warnings };
}

/**
 * Rewrites deprecated rule names throughout an entire {@link Config}: its
 * top-level `rules`, and the `rules` of every `nodeRules` and
 * `childNodeRules` entry. Each location is rewritten independently — a
 * `nodeRules` entry's `rules` has no named-group concern (that type doesn't
 * accept them), so it goes straight through {@link expandBaseRules}.
 *
 * Call this once, on the fully `extends`-merged `Config`, before it reaches
 * `convertRuleset`/`resolveRules` — same placement rationale as
 * {@link applyRuleAliases}.
 */
export function applyRuleAliasesToConfig<C extends Config>(
	config: C,
	table: RuleAliasTable,
): { readonly config: C; readonly warnings: readonly RuleAliasWarning[] } {
	const warnings: RuleAliasWarning[] = [];

	const { rules, warnings: topLevelWarnings } = applyRuleAliases(config.rules, table);
	warnings.push(...topLevelWarnings);

	const nodeRules = config.nodeRules?.map(nodeRule => rewriteNodeRuleLike(nodeRule, table, warnings));
	const childNodeRules = config.childNodeRules?.map(childNodeRule =>
		rewriteNodeRuleLike(childNodeRule, table, warnings),
	);

	return {
		config: {
			...config,
			...(rules !== undefined && { rules }),
			...(nodeRules !== undefined && { nodeRules }),
			...(childNodeRules !== undefined && { childNodeRules }),
		} as C,
		warnings,
	};
}

function rewriteNodeRuleLike<T extends NodeRule | ChildNodeRule>(
	nodeRuleLike: T,
	table: RuleAliasTable,
	warnings: RuleAliasWarning[],
): T {
	if (!nodeRuleLike.rules) {
		return nodeRuleLike;
	}
	const localWarnings: RuleAliasWarning[] = [];
	const rules = expandBaseRules(nodeRuleLike.rules, table, localWarnings);
	warnings.push(...localWarnings);
	return { ...nodeRuleLike, rules };
}

/**
 * Core expansion shared by every call site: rewrites a flat base-rules map
 * (no named-group entries) through `table`, appending one
 * {@link RuleAliasWarning} per deprecated key actually used to `warnings`.
 *
 * If the caller also configured a replacement directly, that explicit
 * setting wins over anything inferred from the alias (checked against the
 * *original* map, so this is independent of key iteration order). Two
 * different deprecated keys that expand into the same replacement are
 * combined with the same right-side-wins semantics `mergeRule` uses
 * elsewhere.
 */
function expandBaseRules(
	baseRules: Readonly<Record<string, AnyRule>>,
	table: RuleAliasTable,
	warnings: RuleAliasWarning[],
): Record<string, AnyRule> {
	const result: Record<string, AnyRule> = {};

	for (const [key, value] of Object.entries(baseRules)) {
		const entry = table[key];
		if (!entry) {
			result[key] = value;
			continue;
		}

		const expanded = entry.expand(value);
		const replacedBy = Object.keys(expanded);
		warnings.push({ deprecatedName: key, replacedBy });

		for (const [newName, newValue] of Object.entries(expanded)) {
			if (newName in baseRules) {
				// The user also configured the replacement directly — that
				// explicit setting wins over anything inferred from the alias.
				continue;
			}
			result[newName] = mergeExpanded(result[newName], newValue);
		}
	}

	return result;
}

/**
 * Combines two `AnyRule` values for the same target key using the simplest
 * rule that keeps this module's expansion a pure function of its input
 * without importing `mergeRule` (which would pull in `merge-config.ts`'s
 * full shallow-merge machinery for what is, in practice, almost always a
 * single writer per key): the later one replaces the earlier one when both
 * are `RuleConfigValue`s; when both are objects, they are shallow-merged
 * with the later one's keys winning.
 */
function mergeExpanded(existing: AnyRule | undefined, incoming: AnyRule): AnyRule {
	if (existing === undefined) {
		return incoming;
	}
	if (
		typeof existing !== 'object' ||
		existing === null ||
		Array.isArray(existing) ||
		typeof incoming !== 'object' ||
		incoming === null ||
		Array.isArray(incoming)
	) {
		return incoming;
	}
	return { ...existing, ...incoming };
}
