import { test, expect } from 'vitest';

import { createConfig } from './create-config.js';

test('none', () => {
	const result = createConfig(
		['jsx', 'vue', 'svelte', 'astro', 'pug', 'php', 'smarty', 'erb', 'ejs', 'mustache', 'nunjucks', 'liquid'],
		'none',
		{
			'attr-duplication': {
				category: 'structure',
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
				category: 'style',
				defaultValue: false,
			},
			'deprecated-attr': {
				category: 'structure',
				defaultValue: true,
			},
			'deprecated-element': {
				category: 'structure',
				defaultValue: true,
			},
			'disallowed-element': {
				category: 'structure',
				defaultValue: true,
			},
			doctype: {
				category: 'structure',
				defaultValue: 'always',
			},
			'end-tag': {
				category: 'style',
				defaultValue: false,
			},
			'id-duplication': {
				category: 'structure',
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
				category: 'structure',
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
				category: 'structure',
				defaultValue: true,
			},
			'require-accessible-name': {
				category: 'a11y',
				defaultValue: true,
			},
			'required-attr': {
				category: 'structure',
				defaultValue: true,
			},
			'required-element': {
				category: 'structure',
				defaultValue: true,
			},
			'required-h1': {
				category: 'a11y',
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
		},
	);

	expect(result).toStrictEqual({
		parser: {
			'\\.(mustache|hbs)$': '@markuplint/mustache-parser',
			'\\.[jt]sx?$': '@markuplint/jsx-parser',
			'\\.astro$': '@markuplint/astro-parser',
			'\\.ejs$': '@markuplint/ejs-parser',
			'\\.erb$': '@markuplint/erb-parser',
			'\\.liquid$': '@markuplint/liquid-parser',
			'\\.nunjucks$': '@markuplint/nunjucks-parser',
			'\\.php$': '@markuplint/php-parser',
			'\\.pug$': '@markuplint/pug-parser',
			'\\.svelte$': '@markuplint/svelte-parser',
			'\\.tpl$': '@markuplint/smarty-parser',
			'\\.vue$': '@markuplint/vue-parser',
		},
		specs: {
			'\\.[jt]sx?$': '@markuplint/react-spec',
			'\\.svelte$': '@markuplint/svelte-spec',
			'\\.vue$': '@markuplint/vue-spec',
		},
		rules: {
			'attr-duplication': true,
			'attr-value-quotes': false,
			'case-sensitive-attr-name': false,
			'case-sensitive-tag-name': false,
			'character-reference': true,
			'class-naming': false,
			'deprecated-attr': true,
			'deprecated-element': true,
			'disallowed-element': true,
			doctype: 'always',
			'end-tag': false,
			'id-duplication': true,
			'ineffective-attr': false,
			'invalid-attr': true,
			'label-has-control': false,
			'landmark-roles': false,
			'no-boolean-attr-value': false,
			'no-default-value': false,
			'no-empty-palpable-content': false,
			'no-hard-code-id': false,
			'no-refer-to-non-existent-id': true,
			'no-use-event-handler-attr': false,
			'permitted-contents': true,
			'require-accessible-name': true,
			'required-attr': true,
			'required-element': true,
			'required-h1': true,
			'table-row-column-alignment': false,
			'use-list': false,
			'wai-aria': true,
		},
	});
});

test('custom:a11y', () => {
	const result = createConfig(['jsx'], ['a11y'], {
		'attr-duplication': {
			category: 'structure',
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
			category: 'style',
			defaultValue: false,
		},
		'deprecated-attr': {
			category: 'structure',
			defaultValue: true,
		},
		'deprecated-element': {
			category: 'structure',
			defaultValue: true,
		},
		'disallowed-element': {
			category: 'structure',
			defaultValue: true,
		},
		doctype: {
			category: 'structure',
			defaultValue: 'always',
		},
		'end-tag': {
			category: 'style',
			defaultValue: false,
		},
		'id-duplication': {
			category: 'structure',
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
			category: 'structure',
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
			category: 'structure',
			defaultValue: true,
		},
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'required-attr': {
			category: 'structure',
			defaultValue: true,
		},
		'required-element': {
			category: 'structure',
			defaultValue: true,
		},
		'required-h1': {
			category: 'a11y',
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
	});

	expect(result).toStrictEqual({
		parser: {
			'\\.[jt]sx?$': '@markuplint/jsx-parser',
		},
		specs: {
			'\\.[jt]sx?$': '@markuplint/react-spec',
		},
		rules: {
			'label-has-control': false,
			'landmark-roles': false,
			'no-refer-to-non-existent-id': true,
			'require-accessible-name': true,
			'required-h1': true,
			'table-row-column-alignment': false,
			'use-list': false,
			'wai-aria': true,
		},
	});
});

test('recommended', () => {
	const result = createConfig(['svelte', 'astro'], 'recommended', {
		'attr-duplication': {
			category: 'structure',
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
			category: 'style',
			defaultValue: false,
		},
		'deprecated-attr': {
			category: 'structure',
			defaultValue: true,
		},
		'deprecated-element': {
			category: 'structure',
			defaultValue: true,
		},
		'disallowed-element': {
			category: 'structure',
			defaultValue: true,
		},
		doctype: {
			category: 'structure',
			defaultValue: 'always',
		},
		'end-tag': {
			category: 'style',
			defaultValue: false,
		},
		'id-duplication': {
			category: 'structure',
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
			category: 'structure',
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
			category: 'structure',
			defaultValue: true,
		},
		'require-accessible-name': {
			category: 'a11y',
			defaultValue: true,
		},
		'required-attr': {
			category: 'structure',
			defaultValue: true,
		},
		'required-element': {
			category: 'structure',
			defaultValue: true,
		},
		'required-h1': {
			category: 'a11y',
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
	});

	expect(result).toStrictEqual({
		extends: ['markuplint:recommended'],
		parser: {
			'\\.astro$': '@markuplint/astro-parser',
			'\\.svelte$': '@markuplint/svelte-parser',
		},
		specs: {
			'\\.svelte$': '@markuplint/svelte-spec',
		},
	});
});
