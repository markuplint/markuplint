import type { AnyRule, RuleAliasTable } from '@markuplint/ml-config';

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

/**
 * A 1:N split where every replacement takes the exact same configuration
 * (severity/reason/options passed through unchanged to each) — for rules
 * with no options whose single check split by *what it checks* rather than
 * by *option*, e.g. `deprecated-attr`'s `obsolete`/`deprecated` split.
 */
function split(...newNames: string[]): RuleAliasTable[string] {
	return {
		expand: rule => Object.fromEntries(newNames.map(name => [name, rule])),
		targets: newNames,
	};
}

type NormalizedRule = {
	readonly severity?: 'error' | 'warning' | 'info';
	readonly options?: Record<string, unknown>;
	readonly reason?: string;
	readonly reasonOnly?: boolean;
};

/** `AnyRule` is either a bare boolean/value shorthand or a full `RuleConfig` object. */
function normalize(rule: AnyRule): NormalizedRule {
	if (typeof rule !== 'object' || rule === null) {
		return {};
	}
	const { severity, options, reason, reasonOnly } = rule as {
		severity?: 'error' | 'warning' | 'info';
		options?: Record<string, unknown>;
		reason?: string;
		reasonOnly?: boolean;
	};
	return { severity, options, reason, reasonOnly };
}

function withOptions(rule: AnyRule, options?: Record<string, unknown>): AnyRule {
	const { severity, reason, reasonOnly } = normalize(rule);
	return {
		value: true,
		...(severity && { severity }),
		...(options && Object.keys(options).length > 0 && { options }),
		...(reason && { reason }),
		...(reasonOnly && { reasonOnly }),
	};
}

/**
 * `invalid-attr`'s single check split four ways (v5 rule-system redesign):
 * `no-unknown-attr` (name not in spec at all), `no-disallowed-attr` (name
 * known but disallowed here — `noUse` / unmet `condition` / `is` on an
 * autonomous custom element), `no-invalid-attr-value` (value/type
 * violation), and `no-restricted-attr` (purely user-defined `disallowAttrs`
 * denylisting, replacing the old rule's narrow named-rule mode).
 *
 * `allowAttrs` extends what a spec-validating rule considers valid, so it
 * is copied to all three of them: it can suppress `no-unknown-attr` and
 * `no-disallowed-attr`'s reports for a name, and supplies the value type
 * `no-invalid-attr-value` checks against for names the spec doesn't define.
 * `ignoreAttrNamePrefix` is copied to the two name-eligibility rules only —
 * `no-invalid-attr-value` never reports for a name neither rule recognizes,
 * so it needs no exclusion list of its own. `allowToAddPropertiesForPretender`
 * moves to `no-unknown-attr` alone: it is specifically the pretender escape
 * hatch for the "this name doesn't exist" report. `disallowAttrs` moves to
 * `no-restricted-attr` alone — only included when actually configured, so a
 * plain `invalid-attr: true` (no options) never turns on a rule with
 * nothing to restrict.
 */
function expandInvalidAttr(rule: AnyRule): Record<string, AnyRule> {
	const { options } = normalize(rule);
	const allowAttrs = options?.allowAttrs;
	const disallowAttrs = options?.disallowAttrs;
	const ignoreAttrNamePrefix = options?.ignoreAttrNamePrefix;
	const allowToAddPropertiesForPretender = options?.allowToAddPropertiesForPretender;

	const expanded: Record<string, AnyRule> = {
		'no-unknown-attr': withOptions(rule, {
			...(allowAttrs !== undefined && { allowAttrs }),
			...(ignoreAttrNamePrefix !== undefined && { ignoreAttrNamePrefix }),
			...(allowToAddPropertiesForPretender !== undefined && { allowToAddPropertiesForPretender }),
		}),
		'no-disallowed-attr': withOptions(rule, {
			...(allowAttrs !== undefined && { allowAttrs }),
			...(ignoreAttrNamePrefix !== undefined && { ignoreAttrNamePrefix }),
		}),
		'no-invalid-attr-value': withOptions(rule, {
			...(allowAttrs !== undefined && { allowAttrs }),
		}),
	};

	if (disallowAttrs !== undefined) {
		expanded['no-restricted-attr'] = withOptions(rule, { disallowAttrs });
	}

	return expanded;
}

/**
 * `landmark-roles` split two ways: `no-nested-top-level-landmark` (the
 * `ignoreRoles` half — always present, `ignoreRoles` carried over unchanged)
 * and `require-landmark-label` (the `labelEachArea` half, included unless
 * the user explicitly set `labelEachArea: false` to opt out of it; the split
 * rule has no such option itself, so there is nothing to carry over beyond
 * whether it runs at all).
 */
function expandLandmarkRoles(rule: AnyRule): Record<string, AnyRule> {
	const { options } = normalize(rule);
	const ignoreRoles = options?.ignoreRoles;
	const labelEachArea = options?.labelEachArea;

	const expanded: Record<string, AnyRule> = {
		'no-nested-top-level-landmark': withOptions(rule, {
			...(ignoreRoles !== undefined && { ignoreRoles }),
		}),
	};

	if (labelEachArea !== false) {
		expanded['require-landmark-label'] = withOptions(rule);
	}

	return expanded;
}

/**
 * `required-h1` split two ways: `require-h1` (the missing-`<h1>` half —
 * always present regardless of the old options) and `no-duplicate-h1` (the
 * `expected-once` half, included unless the user explicitly set
 * `expected-once: false` to opt out of it). `in-document-fragment` is
 * shared by both halves, so it is copied to each.
 */
function expandRequiredH1(rule: AnyRule): Record<string, AnyRule> {
	const { options } = normalize(rule);
	const inDocumentFragment = options?.['in-document-fragment'];
	const expectedOnce = options?.['expected-once'];
	const sharedOptions = inDocumentFragment === undefined ? undefined : { 'in-document-fragment': inDocumentFragment };

	const expanded: Record<string, AnyRule> = {
		'require-h1': withOptions(rule, sharedOptions),
	};

	if (expectedOnce !== false) {
		expanded['no-duplicate-h1'] = withOptions(rule, sharedOptions);
	}

	return expanded;
}

/**
 * `no-unsupported-features` split three ways: `no-unsupported-browser-features`
 * (the browserslist-based check — always present, `browserslist` /
 * `browserslistConfig` / `browserslistEnv` carried over unchanged),
 * `no-experimental-features` (the `checkExperimental` half, included only
 * when that option was `true` — the split rule has no toggle of its own,
 * enabling it IS the toggle), and `no-nonstandard-features` (the
 * `checkNonStandard` half, same reasoning). `ignoreFeatures` is shared by
 * all three, so it is copied to each.
 */
function expandNoUnsupportedFeatures(rule: AnyRule): Record<string, AnyRule> {
	const { options } = normalize(rule);
	const browserslist = options?.browserslist;
	const browserslistConfig = options?.browserslistConfig;
	const browserslistEnv = options?.browserslistEnv;
	const ignoreFeatures = options?.ignoreFeatures;
	const checkExperimental = options?.checkExperimental;
	const checkNonStandard = options?.checkNonStandard;

	const expanded: Record<string, AnyRule> = {
		'no-unsupported-browser-features': withOptions(rule, {
			...(browserslist !== undefined && { browserslist }),
			...(browserslistConfig !== undefined && { browserslistConfig }),
			...(browserslistEnv !== undefined && { browserslistEnv }),
			...(ignoreFeatures !== undefined && { ignoreFeatures }),
		}),
	};

	if (checkExperimental) {
		expanded['no-experimental-features'] = withOptions(rule, {
			...(ignoreFeatures !== undefined && { ignoreFeatures }),
		});
	}

	if (checkNonStandard) {
		expanded['no-nonstandard-features'] = withOptions(rule, {
			...(ignoreFeatures !== undefined && { ignoreFeatures }),
		});
	}

	return expanded;
}

/**
 * `doctype` split two ways: `require-doctype` (missing-DOCTYPE-entirely, the
 * `value: 'always'` half — always present regardless of the old options) and
 * `no-obsolete-doctype` (the `denyObsoleteType` half, included unless the
 * user explicitly set `denyObsoleteType: false` to opt out of it).
 */
function expandDoctype(rule: AnyRule): Record<string, AnyRule> {
	const { options } = normalize(rule);
	const denyObsoleteType = options?.denyObsoleteType;

	const expanded: Record<string, AnyRule> = {
		'require-doctype': withOptions(rule),
	};

	if (denyObsoleteType !== false) {
		expanded['no-obsolete-doctype'] = withOptions(rule);
	}

	return expanded;
}

export const ruleAliasTable: RuleAliasTable = {
	doctype: {
		expand: expandDoctype,
		targets: ['require-doctype', 'no-obsolete-doctype'],
	},
	'deprecated-attr': split('no-obsolete-attr', 'no-deprecated-attr'),
	'deprecated-element': split('no-obsolete-element', 'no-deprecated-element'),
	'character-reference': split('no-malformed-character-reference', 'no-unescaped-char'),
	'table-row-column-alignment': split(
		'no-table-cell-overlap',
		'no-table-span-overflow',
		'no-empty-table-track',
		'consistent-table-row-length',
	),
	'script-content': split('valid-importmap', 'valid-speculation-rules'),
	'srcset-sizes-constraint': split(
		'no-unpaired-srcset-sizes',
		'no-mixed-srcset-descriptors',
		'sizes-auto-requires-lazy-loading',
		'no-always-matching-source',
	),
	'wai-aria-disallowed-props': split('no-prohibited-naming', 'element-supports-aria-prop', 'role-supports-aria-prop'),
	'wai-aria-implicit-props': split('no-redundant-aria-prop', 'no-contradictory-aria-prop'),
	'landmark-roles': {
		expand: expandLandmarkRoles,
		targets: ['no-nested-top-level-landmark', 'require-landmark-label'],
	},
	'required-h1': {
		expand: expandRequiredH1,
		targets: ['require-h1', 'no-duplicate-h1'],
	},
	'no-unsupported-features': {
		expand: expandNoUnsupportedFeatures,
		targets: ['no-unsupported-browser-features', 'no-experimental-features', 'no-nonstandard-features'],
	},
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

	// A straight rename. The original plan (#4.4) proposed also moving this
	// rule's `{ name, value }` pattern-matching responsibility to
	// `no-restricted-attr` once that rule existed — reconsidered once
	// `no-restricted-attr` actually landed: "require this attribute's value
	// to match a pattern" is a positive REQUIRE constraint, not a denylist,
	// and only fits `no-restricted-attr`'s deny-only shape via an awkward
	// negated pattern that changes the violation message's wording for no
	// real benefit. `require-attr` keeps its full pre-rename scope.
	'required-attr': renamed('require-attr'),

	'invalid-attr': {
		expand: expandInvalidAttr,
		targets: ['no-unknown-attr', 'no-disallowed-attr', 'no-invalid-attr-value', 'no-restricted-attr'],
	},
};
