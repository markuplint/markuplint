import { base } from './base.js';
import { commonjs } from './commonjs.js';
import { parser } from './parser.js';
import { test } from './test.js';
import { ts } from './ts.js';

/**
 * @type {import('eslint').Linter.Config}
 */
export const config = [
	...base,
	{
		files: ['{*,**/*}.cjs'],
		...mergeConfig(commonjs),
	},
	{
		files: ['{*,**/*}.{ts,tsx,cts,mts}', 'packages/@markuplint/file-resolver/test/fixtures/008/.markuplintrc.ts'],
		...mergeConfig(ts),
		ignores: ['**/.*.ts'],
	},
	{
		files: ['./packages/@markuplint/**/parser.ts'],
		...mergeConfig(ts, parser),
	},
	{
		files: ['{*,**/*}.spec.{js,mjs,cjs}'],
		...mergeConfig(commonjs, test),
	},
	{
		files: ['{*,**/*}.spec.ts', 'vitest.config.ts'],
		...mergeConfig(commonjs, ts, test),
	},
	{
		files: ['packages/@markuplint/create-rule/scaffold/**/*'],
		...mergeConfig(ts, test, {
			rules: {
				'unicorn/filename-case': 0,
			},
		}),
	},
];

/**
 *
 * @param {import('eslint').Linter.Config[]} configs
 * @returns {import('eslint').Linter.Config}
 */
function mergeConfig(...configs) {
	function mergeConfig(a, b) {
		return {
			...a,
			...b,
			rules: {
				...a.rules,
				...b.rules,
			},
		};
	}
	return configs.reduce(mergeConfig);
}
