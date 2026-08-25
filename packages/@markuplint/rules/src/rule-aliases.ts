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
/**
 * A 1:1 rename: the old name's resolved configuration passes through
 * unchanged under the new name.
 */
function renamed(newName: string): RuleAliasTable[string] {
	return {
		expand: rule => ({ [newName]: rule }),
		targets: [newName],
	};
}

export const ruleAliasTable: RuleAliasTable = {
	'attr-duplication': renamed('no-duplicate-attr'),
	'id-duplication': renamed('no-duplicate-id'),
	'required-element': renamed('require-element'),
	'ineffective-attr': renamed('no-ineffective-attr'),
	'end-tag': renamed('require-end-tag'),
	'disallowed-element': renamed('no-restricted-element'),
	'correct-aspect-ratio': renamed('no-mismatched-aspect-ratio'),
	'heading-levels': renamed('no-skipped-heading-level'),
	'input-file-empty-value': renamed('no-input-file-value'),
	'neighbor-popovers': renamed('require-adjacent-popover'),
	'no-hard-code-id': renamed('no-hardcoded-id'),
	'no-use-event-handler-attr': renamed('no-event-handler-attr'),
	'redundant-accessible-name': renamed('no-redundant-accessible-name'),
	'use-list': renamed('no-pseudo-list'),
	'wai-aria-abstract-role': renamed('no-abstract-role'),
	'wai-aria-deprecated-role': renamed('no-deprecated-role'),
	'wai-aria-deprecated-props': renamed('no-deprecated-aria-prop'),
	'wai-aria-default-value': renamed('no-default-aria-value'),
	'wai-aria-implicit-role': renamed('no-redundant-role'),
	'wai-aria-no-global-prop': renamed('aria-prop-requires-role'),
	'wai-aria-non-existent-role': renamed('no-unknown-role'),
	'wai-aria-permitted-roles': renamed('permitted-roles'),
	'wai-aria-interaction-in-hidden': renamed('no-focusable-in-aria-hidden'),
	'wai-aria-presentational-children': renamed('no-aria-on-presentational-children'),
	'wai-aria-required-owned-elements': renamed('require-owned-elements'),
	'wai-aria-required-parent-role': renamed('require-parent-role'),
	'wai-aria-required-props': renamed('require-aria-prop'),
	'wai-aria-tab-requires-tabpanel': renamed('tab-requires-tabpanel'),
	'wai-aria-value': renamed('no-invalid-aria-prop-value'),

	// `required-attr` also loses its `{ name, value }` pattern-matching
	// responsibility to `no-restricted-attr` once that rule exists (part of
	// the invalid-attr split) — until then, this is a straight rename.
	'required-attr': renamed('require-attr'),
};
