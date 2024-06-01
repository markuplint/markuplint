/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
	extends: [
		'eslint:recommended',
		'plugin:unicorn/recommended',
		'plugin:regexp/recommended',
		'plugin:import/recommended',
		'plugin:@eslint-community/eslint-comments/recommended',
		'plugin:import/typescript',
	],
	env: {
		browser: false,
		es6: true,
		node: true,
		commonjs: false,
	},
	plugins: ['unicorn', '@typescript-eslint', 'jsdoc', 'import', 'sort-class-members'],
	parserOptions: {
		ecmaVersion: 13,
	},
	rules: {
		indent: 0,
		quotes: [2, 'single', 'avoid-escape'],
		'no-var': 2,
		'prefer-const': 2,
		'no-dupe-class-members': 0,
		'no-unused-vars': 0,
		'no-array-constructor': 0,
		'sort-imports': 0,
		'no-console': [1],
		'no-mixed-spaces-and-tabs': 0,
		'require-await': 2,
		'lines-between-class-members': [1, 'always', { exceptAfterSingleLine: true }],
		'no-restricted-globals': [2, '__dirname', 'require'],

		'node/no-unsupported-features/es-syntax': 0,

		'unicorn/consistent-destructuring': 0,
		'unicorn/consistent-function-scoping': 0,
		'unicorn/no-array-callback-reference': 0,
		'unicorn/no-nested-ternary': 0,
		'unicorn/no-null': 0,
		'unicorn/prefer-query-selector': 0,
		'unicorn/prefer-ternary': 0,
		'unicorn/prevent-abbreviations': 0,

		'@eslint-community/eslint-comments/no-unused-disable': 'error',

		'import/no-named-as-default': 0,
		'import/no-default-export': 2,
		'import/order': [
			'error',
			{
				groups: ['type', 'builtin', 'external', 'parent', 'sibling', 'index', 'object'],
				pathGroups: [
					{
						pattern: '@alias/**',
						group: 'parent',
						position: 'before',
					},
				],
				alphabetize: {
					order: 'asc',
				},
				'newlines-between': 'always',
			},
		],
		'import/no-extraneous-dependencies': 2,

		'sort-class-members/sort-class-members': [
			1,
			{
				order: [
					'[static-properties]',
					'[static-methods]',
					'[properties]',
					'[conventional-private-properties]',
					'constructor',
					'[methods]',
					'[conventional-private-methods]',
				],
				accessorPairPositioning: 'getThenSet',
			},
		],
	},
	settings: {
		jsdoc: {
			tagNamePreference: {
				param: 'arg',
				returns: 'return',
			},
		},
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/resolver': {
			typescript: {
				alwaysTryTypes: true,
				project: ['packages/*/tsconfig.json'],
			},
		},
	},
};
