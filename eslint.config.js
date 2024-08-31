import { config } from '@markuplint-dev/eslint-config';
import reactPlugin from 'eslint-plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import { fixupPluginRules } from '@eslint/compat';
import importPlugin from 'eslint-plugin-import';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const websiteDir = path.resolve(__dirname, 'website');

export default [
	...config,
	{
		ignores: [
			'**/*.d.ts',
			'**/lib/*',
			'**/esm/*',
			'**/cjs/*',
			'packages/@markuplint/pretenders/test/**/*.tsx',
			'vscode/test/suite/*.js',
			'vscode/.vscode-test',
		],
	},

	// Website
	reactPlugin.configs.flat.recommended,
	{
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				React: true,
				JSX: true,
			},
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			'react/display-name': 0,
			'react/prop-types': 0,
			'unicorn/filename-case': 0,
		},
		ignores: [`${websiteDir}/build/**/*`, `${websiteDir}/.docusaurus/**/*`],
	},
	{
		files: ['**/*.tsx'],
		plugins: {
			'react-hooks': fixupPluginRules(reactHooksPlugin),
			import: importPlugin,
		},
		rules: {
			...reactHooksPlugin.configs.recommended.rules,
			...importPlugin.configs.recommended.rules,
			'@typescript-eslint/prefer-readonly-parameter-types': 0,
			'unicorn/filename-case': [
				0,
				{
					pascalCase: true,
				},
			],

			'import/no-unresolved': [
				2,
				{
					commonjs: true,
					ignore: ['^@docusaurus/', '^@site/', '^@theme/', '^@theme-original/'],
				},
			],
			'import/no-named-as-default': 0,
			// 'import/no-default-export': 2,
			'import/no-default-export': 0,
			'import/no-extraneous-dependencies': 2,
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

			// For an issue: https://github.com/import-js/eslint-plugin-import/issues/2995
			'import/no-named-as-default-member': 0,
			// For an issue: https://github.com/eslint/eslint/issues/17953
			'import/namespace': 0,
		},
		settings: {
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
	},
	{
		files: [`${websiteDir}/*.js`, `${websiteDir}/**/*.js`],
		rules: {
			'@typescript-eslint/no-require-imports': 0,
			'@typescript-eslint/no-var-requires': 0,
			'no-restricted-globals': 0,
			'unicorn/prefer-module': 0,
		},
	},
];
