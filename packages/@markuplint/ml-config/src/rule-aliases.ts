import type { AnyRule, Rules } from './types.js';

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
 */
export function applyRuleAliases(
	rules: Rules | undefined,
	table: RuleAliasTable,
): { readonly rules: Rules | undefined; readonly warnings: readonly RuleAliasWarning[] } {
	if (!rules) {
		return { rules, warnings: [] };
	}

	const warnings: RuleAliasWarning[] = [];
	const result: Record<string, AnyRule> = {};
	const named: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(rules)) {
		if (key.includes('/')) {
			named[key] = value;
			continue;
		}
		const entry = table[key];
		if (!entry) {
			// A plain (non-deprecated) key can never have been written to
			// `result` already: `Object.entries` yields each key once, and
			// the alias branch below only ever writes to *other* keys
			// (`newName`), skipping any that coincide with a literal key in
			// the original `rules` — see the `newName in rules` check.
			result[key] = value as AnyRule;
			continue;
		}

		const expanded = entry.expand(value as AnyRule);
		const replacedBy = Object.keys(expanded);
		warnings.push({ deprecatedName: key, replacedBy });

		for (const [newName, newValue] of Object.entries(expanded)) {
			if (newName in rules) {
				// The user also configured the replacement directly — that
				// explicit setting wins over anything inferred from the alias.
				continue;
			}
			result[newName] = mergeExpanded(result[newName], newValue);
		}
	}

	return { rules: { ...result, ...named } as Rules, warnings };
}

/**
 * Combines two `AnyRule` values for the same target key using the simplest
 * rule that keeps `applyRuleAliases` a pure function of its input without
 * importing `mergeRule` (which would pull in `merge-config.ts`'s full
 * shallow-merge machinery for what is, in practice, almost always a single
 * writer per key): the later one replaces the earlier one when both are
 * `RuleConfigValue`s; when both are objects, they are shallow-merged with
 * the later one's keys winning.
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
