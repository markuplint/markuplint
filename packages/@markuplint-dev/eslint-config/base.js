import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import * as regexp from 'eslint-plugin-regexp';
import sortClassMembers from 'eslint-plugin-sort-class-members';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tsESLint from 'typescript-eslint';

/**
 * @type {import('eslint').Linter.Config}
 */
export const base = [
	js.configs.recommended,
	...tsESLint.configs.recommended,
	importX.flatConfigs.recommended,
	unicorn.configs['flat/recommended'],
	regexp.configs['flat/recommended'],
	sortClassMembers.configs['flat/recommended'],
	{
		plugins: {
			jsdoc,
		},
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				ecmaVersion: 13,
			},
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
			'import-x/no-named-as-default-member': 0,
			'lines-between-class-members': [1, 'always', { exceptAfterSingleLine: true }],
			'no-restricted-globals': [2, '__dirname', 'require'],

			'node/no-unsupported-features/es-syntax': 0,

			'unicorn/consistent-destructuring': 0,
			'unicorn/consistent-function-scoping': 0,
			'unicorn/no-array-callback-reference': 0,
			'unicorn/no-nested-ternary': 0,
			'unicorn/no-null': 0,
			'unicorn/prefer-query-selector': 0,
			'unicorn/prefer-string-raw': 0,
			'unicorn/prefer-ternary': 0,
			'unicorn/prevent-abbreviations': 0,

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
			'import-x/resolver-next': [createTypeScriptImportResolver()],
		},
	},
	// for Node.js v18
	{
		rules: {
			'unicorn/no-array-reverse': 0,
		},
	},
];
