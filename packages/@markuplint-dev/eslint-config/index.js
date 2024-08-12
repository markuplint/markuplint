const base = require('./base');
const parser = require('./parser');
const test = require('./test');
const ts = require('./ts');

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
	...base,
	overrides: [
		{
			files: ['{*,**/*}.{ts,tsx,cts,mts}'],
			...mergeConfig(base, ts),
		},
		{
			files: ['./packages/@markuplint/**/parser.ts'],
			...mergeConfig(base, ts, parser),
		},
		{
			files: ['{*,**/*}.spec.{js,mjs,cjs}'],
			...mergeConfig(base, test),
		},
		{
			files: ['{*,**/*}.spec.ts', 'vitest.config.ts'],
			...mergeConfig(base, ts, test),
		},
		{
			files: ['packages/@markuplint/create-rule/scaffold/**/*'],
			...mergeConfig(base, ts, test, {
				rules: {
					'unicorn/filename-case': 0,
				},
			}),
		},
	],
};

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
