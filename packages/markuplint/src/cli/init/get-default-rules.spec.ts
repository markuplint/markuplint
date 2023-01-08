import { getDefaultRules } from './get-default-rules';

test('v3.0.0', async () => {
	const defaultRules = await getDefaultRules('3.0.0');
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
			defaultValue: true,
		},
		doctype: {
			category: 'validation',
			defaultValue: 'always',
		},
		'end-tag': {
			category: 'style',
			defaultValue: false,
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
			category: 'style',
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
		'no-boolean-attr-value': {
			category: 'style',
			defaultValue: false,
		},
		'no-default-value': {
			category: 'style',
			defaultValue: false,
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
			defaultValue: true,
		},
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'required-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'required-element': {
			category: 'validation',
			defaultValue: true,
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

test('Unexist version fallback to v3.0.0', async () => {
	const defaultRules = await getDefaultRules('0.0.0-unknown');
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
			defaultValue: true,
		},
		doctype: {
			category: 'validation',
			defaultValue: 'always',
		},
		'end-tag': {
			category: 'style',
			defaultValue: false,
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
			category: 'style',
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
		'no-boolean-attr-value': {
			category: 'style',
			defaultValue: false,
		},
		'no-default-value': {
			category: 'style',
			defaultValue: false,
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
			defaultValue: true,
		},
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'required-attr': {
			category: 'validation',
			defaultValue: true,
		},
		'required-element': {
			category: 'validation',
			defaultValue: true,
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
