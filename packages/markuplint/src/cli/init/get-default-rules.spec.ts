import { test, expect } from 'vitest';

import { getDefaultRules } from './get-default-rules.js';

test('default-rules', () => {
	const defaultRules = getDefaultRules();
	expect(defaultRules).toStrictEqual({
		'no-duplicate-attr': {
			category: 'validation',
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
			category: 'style',
			defaultValue: true,
		},
		'no-unescaped-char': {
			category: 'style',
			defaultValue: true,
		},
		'class-naming': {
			category: 'naming-convention',
			defaultValue: false,
		},
		'no-mismatched-aspect-ratio': {
			category: 'validation',
			defaultValue: false,
		},
		'no-restricted-element': {
			category: 'validation',
			defaultValue: [],
		},
		'require-doctype': {
			category: 'validation',
			defaultValue: 'always',
		},
		'no-obsolete-doctype': {
			category: 'validation',
			defaultValue: true,
		},
		'require-end-tag': {
			category: 'style',
			defaultValue: false,
		},
		'form-attr-references-form': {
			category: 'validation',
			defaultValue: true,
		},
		'head-element-order': {
			category: 'style',
			defaultValue: false,
		},
		'no-skipped-heading-level': {
			category: 'validation',
			defaultValue: true,
		},
		'no-duplicate-id': {
			category: 'validation',
			defaultValue: true,
		},
		'no-ineffective-attr': {
			category: 'style',
			defaultValue: false,
		},
		'input-button-non-empty-value': {
			category: 'validation',
			defaultValue: true,
		},
		'no-input-file-value': {
			category: 'validation',
			defaultValue: true,
		},
		'input-list-references-datalist': {
			category: 'validation',
			defaultValue: true,
		},
		'no-unknown-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'no-disallowed-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'no-invalid-attr-value': {
			category: 'validation',
			defaultValue: true,
		},
		'no-restricted-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'itemprop-requires-itemscope': {
			category: 'validation',
			defaultValue: true,
		},
		'label-for-references-labelable': {
			category: 'validation',
			defaultValue: true,
		},
		'label-has-control': {
			category: 'a11y',
			defaultValue: false,
		},
		'label-no-multiple-controls': {
			category: 'validation',
			defaultValue: true,
		},
		'landmark-roles': {
			category: 'a11y',
			defaultValue: false,
		},
		'link-types': {
			category: 'validation',
			defaultValue: true,
		},
		'map-id-name-match': {
			category: 'validation',
			defaultValue: true,
		},
		'meta-charset-position': {
			category: 'validation',
			defaultValue: true,
		},
		'meter-value-bounds': {
			category: 'validation',
			defaultValue: true,
		},
		'require-adjacent-popover': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-ambiguous-navigable-target-names': {
			category: 'a11y',
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
			category: 'validation',
			defaultValue: true,
		},
		'no-default-value': {
			category: 'style',
			defaultValue: false,
		},
		'no-duplicate-autofocus': {
			category: 'validation',
			defaultValue: true,
		},
		'no-duplicate-dt': {
			category: 'validation',
			defaultValue: true,
		},
		'no-duplicate-visible-main': {
			category: 'validation',
			defaultValue: true,
		},
		'no-empty-palpable-content': {
			category: 'validation',
			defaultValue: false,
		},
		'no-extra-selected-options': {
			category: 'validation',
			defaultValue: true,
		},
		'no-hardcoded-id': {
			category: 'maintainability',
			defaultValue: false,
		},
		'no-orphaned-end-tag': {
			category: 'validation',
			defaultValue: true,
		},
		'no-refer-to-non-existent-id': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-broken-fragment-link': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-stray-head-or-body-tag': {
			category: 'validation',
			defaultValue: true,
		},
		'no-unclosed-element-at-eof': {
			category: 'validation',
			defaultValue: true,
		},
		'no-unsupported-features': {
			category: 'validation',
			defaultValue: false,
		},
		'no-event-handler-attr': {
			category: 'maintainability',
			defaultValue: false,
		},
		'permitted-contents': {
			category: 'validation',
			defaultValue: [],
		},
		'no-disallowed-ancestor': {
			category: 'validation',
			defaultValue: true,
		},
		'require-ancestor': {
			category: 'validation',
			defaultValue: true,
		},
		'no-duplicate-sibling-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'placeholder-label-option': {
			category: 'validation',
			defaultValue: true,
		},
		'progress-value-bounds': {
			category: 'validation',
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
			category: 'validation',
			defaultValue: true,
		},
		'require-dialog-autofocus': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-attr': {
			category: 'validation',
			defaultValue: [],
		},
		'require-element': {
			category: 'validation',
			defaultValue: [],
		},
		'required-h1': {
			category: 'a11y',
			defaultValue: true,
		},
		'valid-importmap': {
			category: 'validation',
			defaultValue: true,
		},
		'valid-speculation-rules': {
			category: 'validation',
			defaultValue: true,
		},
		'no-unpaired-srcset-sizes': {
			category: 'validation',
			defaultValue: true,
		},
		'no-mixed-srcset-descriptors': {
			category: 'validation',
			defaultValue: true,
		},
		'sizes-auto-requires-lazy-loading': {
			category: 'validation',
			defaultValue: true,
		},
		'no-always-matching-source': {
			category: 'validation',
			defaultValue: true,
		},
		'no-table-cell-overlap': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-table-span-overflow': {
			category: 'a11y',
			defaultValue: true,
		},
		'no-empty-table-track': {
			category: 'a11y',
			defaultValue: true,
		},
		'consistent-table-row-length': {
			category: 'a11y',
			defaultValue: false,
		},
		'no-pseudo-list': {
			category: 'a11y',
			defaultValue: false,
		},
		'usemap-references-map': {
			category: 'validation',
			defaultValue: true,
		},
		'wai-aria': {
			category: 'a11y',
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
			category: 'validation',
			defaultValue: false,
		},
		'no-deprecated-element': {
			category: 'validation',
			defaultValue: false,
		},
		'no-obsolete-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'no-obsolete-element': {
			category: 'validation',
			defaultValue: true,
		},
		'no-deprecated-role': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-disallowed-props': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-implicit-props': {
			category: 'a11y',
			defaultValue: false,
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
		'no-aria-on-presentational-children': {
			category: 'a11y',
			defaultValue: false,
		},
		'require-owned-elements': {
			category: 'a11y',
			defaultValue: false,
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
	});
});
