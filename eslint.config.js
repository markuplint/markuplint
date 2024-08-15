import { config } from '@markuplint-dev/eslint-config';
import reactPlugin from 'eslint-plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.resolve(__dirname, 'website');

export default [
	...config,
	{
		ignores: ['**/*.d.ts', '**/lib/*', '**/esm/*', '**/cjs/*', 'vscode/test/suite/*.js'],
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
		ignores: [`${dir}/build/**/*`, `${dir}/.docusaurus/**/*`],
	},
	{
		files: ['**/*.tsx'],
		rules: {
			'@typescript-eslint/prefer-readonly-parameter-types': 0,
			'unicorn/filename-case': [
				0,
				{
					pascalCase: true,
				},
			],
		},
	},
	{
		files: ['*.js', '**/*.js'],
		rules: {
			'@typescript-eslint/no-require-imports': 0,
			'@typescript-eslint/no-var-requires': 0,
			'no-restricted-globals': 0,
			'unicorn/prefer-module': 0,
		},
	},
];
