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
 *
 * `nodeRules` mirrors the document-uniqueness virtual rules defined in
 * `markuplint:html-standard` (preset.html-standard.jsonc). The preset is
 * intentionally not extended wholesale to keep the rule surface curated
 * for nu-validator parity; only the entries that map onto a nu capability
 * are mirrored here.
 */
export const benchmarkConfig: Config = {
	rules: {
		'permitted-contents': true,
		'required-attr': true,
		'input-button-non-empty-value': true,
		'input-file-empty-value': true,
		'invalid-attr': true,
		'form-attr-references-form': true,
		'label-no-multiple-controls': true,
		'no-refer-to-non-existent-id': true,
		'deprecated-element': true,
		'deprecated-attr': true,
		'id-duplication': true,
		'no-duplicate-autofocus': true,
		'no-duplicate-visible-main': true,
		'placeholder-label-option': true,
		'link-types': { options: { allowMicroformats: true } },
		'map-id-name-match': true,
		'meter-value-bounds': true,
		// Catches skipped heading levels (HTML LS §4.3.11).
		'heading-levels': true,
		// Catches `<div id="a" id="b">`-style duplicate attribute names (HTML LS tokenizer).
		'attr-duplication': true,
		// Catches missing/legacy/quirky DOCTYPE (HTML LS §13.2 — non-`<!DOCTYPE html>` declarations).
		doctype: true,
		// Catches an `[itemprop]` element that is not part of any item (HTML LS §5.2.4).
		'itemprop-requires-itemscope': true,
		'no-extra-selected-options': true,
		'no-orphaned-end-tag': true,
		'srcset-sizes-constraint': true,
		'wai-aria-non-existent-role': true,
		'wai-aria-abstract-role': true,
		'wai-aria-permitted-roles': true,
		'wai-aria-required-props': true,
		'wai-aria-disallowed-props': true,
		// HTML LS / ARIA in HTML conformance: native HTML attributes MUST be used in preference
		// to their ARIA equivalents. The rule defaults to severity 'warning' for ergonomic reasons;
		// the bench treats it as a hard error to align with ARIA-in-HTML §6.
		'wai-aria-implicit-props': { severity: 'error' },
		'wai-aria-value': true,
		'wai-aria-required-owned-elements': true,
		'wai-aria-required-parent-role': true,
		'wai-aria-no-global-prop': true,
	},
	nodeRules: [
		{
			selector: ':where(head)',
			rules: {
				// Selectors mirror the document-uniqueness virtual rules in
				// `markuplint:html-standard`. Attribute names follow HTML's
				// ASCII case-insensitive matching (handled by the selector
				// engine), and the `i` flag is applied to value comparisons
				// where the spec calls for it.
				'disallowed-element': [
					// Mirrors html-standard/no-duplicate-charset
					'meta[charset] ~ meta[charset]',
					// Mirrors html-standard/no-duplicate-description
					'meta[name="description" i] ~ meta[name="description" i]',
					// Mirrors html-standard/no-charset-http-equiv-coexist
					'meta[charset] ~ meta[http-equiv="content-type" i]',
					'meta[http-equiv="content-type" i] ~ meta[charset]',
				],
			},
		},
	],
};
