module.exports = {
	root: true,
	extends: ['eslint:recommended'],
	env: {
		browser: false,
		es6: true,
		node: true,
		jest: true,
	},
	plugins: ['jsdoc', 'eslint-comments'],
	parserOptions: {
		ecmaVersion: 2021,
		sourceType: 'module',
	},
	rules: {
		indent: 0,
		quotes: [2, 'single', 'avoid-escape'],
		'no-var': 2,
		'prefer-const': 2,
		'no-dupe-class-members': 0,
		'no-unused-vars': 0,
		'no-array-constructor': 0,
		'sort-imports': [2],
		'no-console': [1],
		'no-mixed-spaces-and-tabs': 0,

		'node/no-unsupported-features/es-syntax': 0,

		'eslint-comments/disable-enable-pair': 2,
		'eslint-comments/no-duplicate-disable': 2,
		'eslint-comments/no-unlimited-disable': 2,
		'eslint-comments/no-unused-disable': 2,
		'eslint-comments/no-unused-enable': 2,
		'eslint-comments/no-use': 0,
	},
	settings: {
		jsdoc: {
			tagNamePreference: {
				param: 'arg',
				returns: 'return',
			},
		},
	},
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			plugins: ['@typescript-eslint'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				project: [require.resolve('./tsconfig.base.json')],
			},
			rules: {
				'@typescript-eslint/no-unused-vars': [2, { args: 'none' }],
				'@typescript-eslint/no-array-constructor': 2,
				'@typescript-eslint/adjacent-overload-signatures': 2,
				'@typescript-eslint/no-namespace': [2, { allowDeclarations: true }],
				'@typescript-eslint/prefer-namespace-keyword': 2,
				'@typescript-eslint/no-var-requires': 2,
				'@typescript-eslint/no-unnecessary-type-assertion': 2,
				'@typescript-eslint/restrict-plus-operands': 0,
			},
		},
	],
};
