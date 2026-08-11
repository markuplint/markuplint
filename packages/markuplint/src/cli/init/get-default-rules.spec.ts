import { test, expect } from 'vitest';

import { getDefaultRules } from './get-default-rules.js';

test('default-rules', () => {
	const defaultRules = getDefaultRules();
	expect(defaultRules).toStrictEqual({
		'attr-duplication': {
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
		'character-reference': {
			category: 'style',
			defaultValue: true,
		},
		'class-naming': {
			category: 'naming-convention',
			defaultValue: false,
		},
		'correct-aspect-ratio': {
			category: 'validation',
			defaultValue: false,
		},
		'deprecated-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'deprecated-element': {
			category: 'validation',
			defaultValue: true,
		},
		'disallowed-element': {
			category: 'validation',
			defaultValue: [],
		},
		doctype: {
			category: 'validation',
			defaultValue: 'always',
		},
		'end-tag': {
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
		'heading-levels': {
			category: 'validation',
			defaultValue: true,
		},
		'id-duplication': {
			category: 'validation',
			defaultValue: true,
		},
		'ineffective-attr': {
			category: 'style',
			defaultValue: false,
		},
		'input-button-non-empty-value': {
			category: 'validation',
			defaultValue: true,
		},
		'input-file-empty-value': {
			category: 'validation',
			defaultValue: true,
		},
		'input-list-references-datalist': {
			category: 'validation',
			defaultValue: true,
		},
		'invalid-attr': {
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
		'meter-value-bounds': {
			category: 'validation',
			defaultValue: true,
		},
		'neighbor-popovers': {
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
		'no-hard-code-id': {
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
		'no-unsupported-features': {
			category: 'validation',
			defaultValue: false,
		},
		'no-use-event-handler-attr': {
			category: 'maintainability',
			defaultValue: false,
		},
		'permitted-contents': {
			category: 'validation',
			defaultValue: [],
		},
		'placeholder-label-option': {
			category: 'validation',
			defaultValue: true,
		},
		'progress-value-bounds': {
			category: 'validation',
			defaultValue: true,
		},
		'redundant-accessible-name': {
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
		'required-attr': {
			category: 'validation',
			defaultValue: [],
		},
		'required-element': {
			category: 'validation',
			defaultValue: [],
		},
		'required-h1': {
			category: 'a11y',
			defaultValue: true,
		},
		'script-content': {
			category: 'validation',
			defaultValue: true,
		},
		'srcset-sizes-constraint': {
			category: 'validation',
			defaultValue: true,
		},
		'table-row-column-alignment': {
			category: 'a11y',
			defaultValue: false,
		},
		'use-list': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-abstract-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-default-value': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-deprecated-props': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-deprecated-role': {
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
		'wai-aria-implicit-role': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-interaction-in-hidden': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-no-global-prop': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-non-existent-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-permitted-roles': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-presentational-children': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-required-owned-elements': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria-required-parent-role': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-required-props': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-tab-requires-tabpanel': {
			category: 'a11y',
			defaultValue: true,
		},
		'wai-aria-value': {
			category: 'a11y',
			defaultValue: true,
		},
	});
});
