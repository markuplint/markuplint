import type { Config } from '@markuplint/ml-config';

/**
 * Stable identifier recorded on every markuplint snapshot so future
 * benchmark variants (e.g. a minimal rule preset) can coexist without
 * confusion.
 */
export const BENCHMARK_CONFIG_ID = 'all-rules';

/**
 * Markuplint configuration used for the benchmark. Enables every rule that
 * maps onto a nu-validator capability so the coverage comparison is
 * apples-to-apples. Not exported to end users — this is purely the config
 * the benchmark feeds into `mlTest()`.
 */
export const benchmarkConfig: Config = {
	rules: {
		'permitted-contents': true,
		'required-attr': true,
		'invalid-attr': true,
		'deprecated-element': true,
		'deprecated-attr': true,
		'id-duplication': true,
		'no-duplicate-autofocus': true,
		'no-duplicate-visible-main': true,
		'placeholder-label-option': true,
		'link-types': { options: { allowMicroformats: true } },
		'no-orphaned-end-tag': true,
		'srcset-sizes-constraint': true,
		'wai-aria-non-existent-role': true,
		'wai-aria-abstract-role': true,
		'wai-aria-permitted-roles': true,
		'wai-aria-required-props': true,
		'wai-aria-disallowed-props': true,
		'wai-aria-value': true,
		'wai-aria-required-owned-elements': true,
		'wai-aria-required-parent-role': true,
		'wai-aria-no-global-prop': true,
	},
};
