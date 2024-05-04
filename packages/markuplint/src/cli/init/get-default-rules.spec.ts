import { test, expect } from 'vitest';

import { getDefaultRules } from './get-default-rules.js';

test('default-rules', () => {
	const defaultRules = getDefaultRules();
	expect(defaultRules).toStrictEqual({
		'attr-duplication': {
			category: 'validation',
			defaultValue: true,
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
		'invalid-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'label-has-control': {
			category: 'a11y',
			defaultValue: false,
		},
		'landmark-roles': {
			category: 'a11y',
			defaultValue: false,
		},
		'neighbor-popovers': {
			category: 'a11y',
			defaultValue: true,
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
		'no-duplicate-dt': {
			category: 'validation',
			defaultValue: true,
		},
		'no-empty-palpable-content': {
			category: 'validation',
			defaultValue: false,
		},
		'no-hard-code-id': {
			category: 'maintainability',
			defaultValue: false,
		},
		'no-refer-to-non-existent-id': {
			category: 'a11y',
			defaultValue: true,
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
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'require-datetime': {
			category: 'validation',
			defaultValue: true,
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
		'use-list': {
			category: 'a11y',
			defaultValue: false,
		},
		'wai-aria': {
			category: 'a11y',
			defaultValue: true,
		},
	});
});
