import { config } from '@markuplint-dev/eslint-config';

/**
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	...config,
	{
		files: ['website/**/*'],
		languageOptions: {
			globals: {
				React: true,
				JSX: true,
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		settings: {
			'import/resolver': {
				typescript: [],
			},
			'import/ignore': ['@docusaurus/*'],
		},
		rules: {
			'unicorn/filename-case': 0,
		},
	},
	{
		files: ['website/**/*.tsx', 'website/src/**/*.js'],
		rules: {
			'@typescript-eslint/prefer-readonly-parameter-types': 0,
			'import/no-default-export': 0,
			'unicorn/filename-case': [
				0,
				{
					pascalCase: true,
				},
			],
		},
	},
	{
		files: ['website/*.js'],
		rules: {
			'no-restricted-globals': 0,
			'@typescript-eslint/no-require-imports': 0,
			'@typescript-eslint/no-var-requires': 0,
			'unicorn/prefer-module': 0,
		},
	},
	{
		files: ['website/*.mjs'],
		rules: {
			'import/no-named-as-default-member': 0,
		},
	},
	{
		files: ['website/docusaurus.config.ts', 'website/*.ts'],
		rules: {
			'import/no-default-export': 0,
		},
	},
	{
		ignores: [
			'**/*.d.ts',
			'**/lib/*',
			'**/esm/*',
			'**/cjs/*',
			'vscode/test/suite/*.js',
			'website/build/**/*',
			'website/.docusaurus/**/*',
		],
	},
];
