import { test, expect } from 'vitest';

import { getDefaultRules } from './get-default-rules.js';

test('default-rules', () => {
	const defaultRules = getDefaultRules();
	expect(defaultRules).toStrictEqual({
		'no-duplicate-attr': {
			category: 'syntax',
			defaultValue: true,
		},
		'attr-order': {
			category: 'style',
			defaultValue: false,
		},
		'attr-value-quotes': {
			category: 'style',
			defaultValue: false,
		},
		'case-sensitive-attr-name': {
			category: 'style',
			defaultValue: false,
		},
		'case-sensitive-tag-name': {
			category: 'style',
			defaultValue: false,
		},
		'no-malformed-character-reference': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-unescaped-char': {
			category: 'syntax',
			defaultValue: true,
		},
		'class-naming': {
			category: 'style',
			defaultValue: false,
		},
		'no-mismatched-aspect-ratio': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-restricted-element': {
			category: 'structure',
			defaultValue: [],
		},
		'require-doctype': {
			category: 'structure',
			defaultValue: 'always',
		},
		'no-obsolete-doctype': {
			category: 'structure',
			defaultValue: true,
		},
		'require-end-tag': {
			category: 'style',
			defaultValue: false,
		},
		'form-attr-references-form': {
			category: 'references',
			defaultValue: true,
		},
		'head-element-order': {
			category: 'structure',
			defaultValue: false,
		},
		'no-skipped-heading-level': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-duplicate-id': {
			category: 'references',
			defaultValue: true,
		},
		'no-ineffective-attr': {
			category: 'attributes',
			defaultValue: false,
		},
		'no-input-file-value': {
			category: 'forms',
			defaultValue: true,
		},
		'input-list-references-datalist': {
			category: 'references',
			defaultValue: true,
		},
		'no-unknown-attr': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-disallowed-attr': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-invalid-attr-value': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-restricted-attr': {
			category: 'attributes',
			defaultValue: true,
		},
		'itemprop-requires-itemscope': {
			category: 'attributes',
			defaultValue: true,
		},
		'label-for-references-labelable': {
			category: 'references',
			defaultValue: true,
		},
		'label-has-control': {
			category: 'a11y',
			defaultValue: false,
		},
		'label-no-multiple-controls': {
			category: 'forms',
			defaultValue: true,
		},
		'no-nested-top-level-landmark': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-landmark-label': {
			category: 'a11y',
			defaultValue: false,
		},
		'link-types': {
			category: 'attributes',
			defaultValue: true,
		},
		'map-id-name-match': {
			category: 'attributes',
			defaultValue: true,
		},
		'meta-charset-position': {
			category: 'structure',
			defaultValue: true,
		},
		'meter-value-bounds': {
			category: 'attributes',
			defaultValue: true,
		},
		'require-adjacent-popover': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-ambiguous-navigable-target-names': {
			category: 'attributes',
			defaultValue: false,
		},
		'no-boolean-attr-value': {
			category: 'style',
			defaultValue: false,
		},
		'no-consecutive-br': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-content-after-body': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-default-value': {
			category: 'style',
			defaultValue: false,
		},
		'no-duplicate-autofocus': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-duplicate-dt': {
			category: 'structure',
			defaultValue: false,
		},
		'no-duplicate-visible-main': {
			category: 'structure',
			defaultValue: true,
		},
		'no-empty-palpable-content': {
			category: 'structure',
			defaultValue: false,
		},
		'no-extra-selected-options': {
			category: 'forms',
			defaultValue: true,
		},
		'no-hardcoded-id': {
			category: 'maintainability',
			defaultValue: false,
		},
		'no-orphaned-end-tag': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-refer-to-non-existent-id': {
			category: 'references',
			defaultValue: true,
		},
		'no-broken-fragment-link': {
			category: 'references',
			defaultValue: false,
		},
		'no-stray-head-or-body-tag': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-unclosed-element-at-eof': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-unsupported-browser-features': {
			category: 'compat',
			defaultValue: false,
		},
		'no-experimental-features': {
			category: 'compat',
			defaultValue: false,
		},
		'no-nonstandard-features': {
			category: 'compat',
			defaultValue: false,
		},
		'no-event-handler-attr': {
			category: 'maintainability',
			defaultValue: false,
		},
		'permitted-contents': {
			category: 'structure',
			defaultValue: [],
		},
		'no-disallowed-ancestor': {
			category: 'structure',
			defaultValue: true,
		},
		'require-ancestor': {
			category: 'structure',
			defaultValue: true,
		},
		'no-duplicate-sibling-attr': {
			category: 'structure',
			defaultValue: true,
		},
		'placeholder-label-option': {
			category: 'forms',
			defaultValue: true,
		},
		'progress-value-bounds': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-redundant-accessible-name': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'require-datetime': {
			category: 'attributes',
			defaultValue: true,
		},
		'require-dialog-autofocus': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-attr': {
			category: 'attributes',
			defaultValue: [],
		},
		'require-element': {
			category: 'structure',
			defaultValue: [],
		},
		'require-h1': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-duplicate-h1': {
			category: 'a11y',
			defaultValue: false,
		},
		'valid-importmap': {
			category: 'syntax',
			defaultValue: true,
		},
		'valid-speculation-rules': {
			category: 'syntax',
			defaultValue: true,
		},
		'no-unpaired-srcset-sizes': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-mixed-srcset-descriptors': {
			category: 'attributes',
			defaultValue: true,
		},
		'sizes-auto-requires-lazy-loading': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-always-matching-source': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-table-cell-overlap': {
			category: 'structure',
			defaultValue: true,
		},
		'no-table-span-overflow': {
			category: 'structure',
			defaultValue: true,
		},
		'no-empty-table-track': {
			category: 'structure',
			defaultValue: true,
		},
		'consistent-table-row-length': {
			category: 'structure',
			defaultValue: false,
		},
		'no-pseudo-list': {
			category: 'a11y',
			defaultValue: false,
		},
		'usemap-references-map': {
			category: 'references',
			defaultValue: true,
		},
		'no-abstract-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-default-aria-value': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-deprecated-aria-prop': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-deprecated-attr': {
			category: 'attributes',
			defaultValue: false,
		},
		'no-deprecated-element': {
			category: 'structure',
			defaultValue: false,
		},
		'no-obsolete-attr': {
			category: 'attributes',
			defaultValue: true,
		},
		'no-obsolete-element': {
			category: 'structure',
			defaultValue: true,
		},
		'no-deprecated-role': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-prohibited-naming': {
			category: 'a11y',
			defaultValue: true,
		},
		'element-supports-aria-prop': {
			category: 'a11y',
			defaultValue: true,
		},
		'role-supports-aria-prop': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-redundant-aria-prop': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-contradictory-aria-prop': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-redundant-role': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-focusable-in-aria-hidden': {
			category: 'a11y',
			defaultValue: false,
		},
		'aria-prop-requires-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-unknown-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'permitted-roles': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-aria-on-unsupported-element': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-aria-on-presentational-children': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-owned-elements': {
			category: 'a11y',
			defaultValue: true,
		},
		'require-parent-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'require-aria-prop': {
			category: 'a11y',
			defaultValue: true,
		},
		'tab-requires-tabpanel': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-invalid-aria-prop-value': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-aria-hidden-on-hidden-until-found': {
			category: 'a11y',
			defaultValue: true,
		},
	});
});
