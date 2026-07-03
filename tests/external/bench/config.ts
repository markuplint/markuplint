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
	// The built-in `parse-error` channel ships default-off so end users opt in
	// per parse5 ERR code (e.g. `{ "parseError": { "duplicate-attribute":
	// "error" } }`). The bench enables every code uniformly to maximise
	// conformance coverage — each HTML LS tokenizer / tree-construction
	// parse error that parse5 emits becomes a markuplint error and counts
	// toward `match-error` against nu-validator. parse5 adding new codes
	// flows in automatically without touching this config.
	severity: {
		parseError: 'error',
	},
	// nu-validator's test corpus contains a handful of fixtures that start
	// with `<head>` or `<meta>` without a doctype but are nevertheless full
	// HTML pages (e.g., `html/parsing/...`). The default `'auto'` document
	// detection treats those as fragments, which silences `missing-doctype`
	// and related document-level parse errors. Forcing `'document'` mode in
	// the bench mirrors what nu-validator does (it always treats the input
	// as a full document) and captures the extra coverage. End-user
	// projects keep the `'auto'` default unless they opt in.
	parserOptions: {
		documentMode: 'document',
	},
	rules: {
		'permitted-contents': true,
		'required-attr': true,
		'input-button-non-empty-value': true,
		'input-file-empty-value': true,
		'invalid-attr': true,
		'form-attr-references-form': true,
		'input-list-references-datalist': true,
		'label-for-references-labelable': true,
		'label-no-multiple-controls': true,
		'no-refer-to-non-existent-id': true,
		'deprecated-element': true,
		'deprecated-attr': true,
		'id-duplication': true,
		// Validates `<script>` body against the spec for its `type` (currently importmap, per HTML LS § Parse an import map string).
		'script-content': true,
		'no-duplicate-autofocus': true,
		'no-duplicate-visible-main': true,
		'placeholder-label-option': true,
		'link-types': { options: { allowMicroformats: true } },
		'map-id-name-match': true,
		'meter-value-bounds': true,
		'progress-value-bounds': true,
		// Catches skipped heading levels (HTML LS §4.3.11).
		'heading-levels': true,
		// Catches `<div id="a" id="b">`-style duplicate attribute names (HTML LS tokenizer).
		'attr-duplication': true,
		// Catches missing/legacy/quirky DOCTYPE (HTML LS §13.2 — non-`<!DOCTYPE html>` declarations).
		doctype: true,
		// Catches an `[itemprop]` element that is not part of any item
		// (HTML LS §5.2.3 attribute def + §5.2.5 conformance constraint).
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
		// ARIA in HTML §3: "Authors MAY use the aria-hidden attribute on any HTML element that
		// allows global aria-* attributes, with the exception of focusable elements and the body
		// element." The rule enforces this transitively via WAI-ARIA §Including Elements in the
		// Accessibility Tree: a focusable descendant of an aria-hidden ancestor remains in the
		// accessibility tree, so aria-hidden is ineffective and effectively conflicts with the
		// focusable-element exception. The user-facing default stays 'warning' because the
		// remediation is a UX-shape choice (remove aria-hidden vs. remove focus), not a purely
		// mechanical fix; the bench escalates to align with the ARIA-in-HTML MUST NOT.
		'wai-aria-interaction-in-hidden': { severity: 'error' },
		'wai-aria-value': true,
		// WAI-ARIA 1.2 §5.2.6 Required Owned Elements: "When multiple roles are specified
		// as required owned elements for a role, at least one instance of one required
		// owned element is expected." and "When a widget is missing required owned
		// elements due to script execution or loading, authors MUST mark a containing
		// element with aria-busy equal to true." The rule fires when neither an owned
		// element nor aria-busy is present — precisely the MUST violation. The
		// user-facing default stays 'warning' for author ergonomics; the bench escalates
		// to align with the spec MUST.
		'wai-aria-required-owned-elements': { severity: 'error' },
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
					// Mirrors html-standard/no-base-after-link-or-script
					':is(link, script) ~ base',
				],
			},
		},
	],
};
