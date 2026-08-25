import type { RuleAliasTable } from '@markuplint/ml-config';

/**
 * Maps every rule name removed or renamed by the v5 rule-system redesign
 * (#3989) to how it expands into its current replacement(s). Consumed by
 * `markuplint`'s config resolution via `@markuplint/ml-config`'s
 * `applyRuleAliases`, so a user's existing configuration keeps working
 * (with a deprecation notice) instead of silently losing checks.
 *
 * Populated incrementally, one entry per rename/split commit, once the
 * replacement rule(s) exist — see `spec-conformance.spec.ts` for the
 * matching incremental rollout of `meta.specConformance`. Removed in v6
 * alongside the deprecated names themselves.
 */
export const ruleAliasTable: RuleAliasTable = {};
