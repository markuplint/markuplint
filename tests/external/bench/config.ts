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
		'no-disallowed-ancestor': true,
		'require-ancestor': true,
		'no-duplicate-sibling-attr': true,
		'require-attr': true,
		'no-input-file-value': true,
		'no-unknown-attr': true,
		'no-disallowed-attr': true,
		'no-invalid-attr-value': true,
		'form-attr-references-form': true,
		'input-list-references-datalist': true,
		'label-for-references-labelable': true,
		'label-no-multiple-controls': true,
		'no-refer-to-non-existent-id': true,
		// no-broken-fragment-link (split from no-refer-to-non-existent-id, opinion-level: HTML LS
		// does not treat a broken fragment link as a conformance violation) is intentionally not
		// enabled here — unlike no-deprecated-element/no-deprecated-attr below, nu-validator
		// genuinely never flags this one.
		'no-obsolete-element': true,
		'no-obsolete-attr': true,
		// no-deprecated-element/no-deprecated-attr (factual, MDN/BCD-sourced) were assumed to be
		// pure non-conformance opinion, on the theory that nu-validator never flags them — false:
		// nu-validator treats several MDN-flagged-deprecated attributes (e.g. `<script language>`,
		// `<script charset>`, `<style type>`, `<iframe allowpaymentrequest>`) as outright parse
		// errors, predating what the current HTML LS text still documents. Escalated to `error`
		// here (their user-facing default stays `warning`, matching the plan's factual/BCD
		// classification) purely to align the bench's match-error/nu-only split with nu's verdict.
		'no-deprecated-element': { severity: 'error' },
		'no-deprecated-attr': { severity: 'error' },
		'no-duplicate-id': true,
		// Validates `<script>` body against the spec selected by its `type` (importmap per HTML LS
		// § Parse an import map string; speculationrules per HTML LS §7.6 Speculation rules).
		'valid-importmap': true,
		'valid-speculation-rules': true,
		'no-duplicate-autofocus': true,
		'no-duplicate-visible-main': true,
		'placeholder-label-option': true,
		// allowMicroformats now defaults to true (HTML LS §4.6.6 the rel attribute
		// requires accepting microformats-wiki-registered keywords), so no override
		// is needed here anymore.
		'link-types': true,
		'map-id-name-match': true,
		'usemap-references-map': true,
		'meter-value-bounds': true,
		'progress-value-bounds': true,
		// Catches skipped heading levels (HTML LS §4.3.11).
		'no-skipped-heading-level': true,
		// Catches `<div id="a" id="b">`-style duplicate attribute names (HTML LS tokenizer).
		'no-duplicate-attr': true,
		// Catches a missing DOCTYPE (HTML LS §13.2 — quirky-mode parsing).
		'require-doctype': true,
		// Catches a legacy/obsolete DOCTYPE declaration (HTML LS §13.1.1).
		'no-obsolete-doctype': true,
		// Catches an `[itemprop]` element that is not part of any item
		// (HTML LS §5.2.3 attribute def + §5.2.5 conformance constraint).
		'itemprop-requires-itemscope': true,
		'no-extra-selected-options': true,
		'no-orphaned-end-tag': true,
		// HTML LS §13.2.6.4.7 ("in body" insertion mode, "An end-of-file token"): an
		// element other than the small optional-tag-omission exception list left open
		// at EOF is a parse error (e.g. `<picture>`, which has no such omission rule).
		'no-unclosed-element-at-eof': true,
		// HTML LS §13.2.6.4.17 ("after body" insertion mode, "Anything else"): a start
		// tag or non-whitespace text once the parser has seen `</body>` is a parse
		// error and gets reprocessed back into `<body>`.
		'no-content-after-body': true,
		// Content disallowed in `<head>` (e.g. `<math>`) implicitly closes `head`
		// without itself being a parse error, but a literal `</head>` or a second
		// `<body>` start tag still left in the source afterward is (HTML LS
		// §13.2.6.4.7, "in body" insertion mode: "Any other end tag" / "A start tag
		// whose tag name is 'body'").
		'no-stray-head-or-body-tag': true,
		// HTML LS §4.2.5.4: the element containing the character encoding declaration
		// must be serialized completely within the first 1024 bytes of the document.
		'meta-charset-position': true,
		'no-unpaired-srcset-sizes': true,
		'no-mixed-srcset-descriptors': true,
		'sizes-auto-requires-lazy-loading': true,
		'no-always-matching-source': true,
		// WAI-ARIA role definitions declare `accessibleNameRequired` per role (e.g. the
		// `img` role: "In order for elements with a role of img to be perceivable,
		// authors MUST provide a label using the aria-label or aria-labelledby
		// attribute."), which HTML LS attribute mappings project onto native HTML (e.g.
		// `alt` supplies the accessible name for `img`). Missing `alt` on an `<img>` is
		// therefore a spec MUST violation regardless of ancestor context (e.g. inside
		// `<figure>`).
		'require-accessible-name': true,
		// HTML LS §4.9.12.1 *Forming a table* closes with "Authors must not produce a table with
		// table model errors": cell overlap (Step 14, `no-table-cell-overlap`), a row or column
		// that no cell is anchored to (Step 20, `no-empty-table-track`), and a cell clipped at a
		// row group boundary (§4.9.12 "A cell cannot cover slots that are from two or more row
		// groups.", `no-table-span-overflow`) — all three default to `error`, matching the MUST
		// NOT above, so no override is needed. `consistent-table-row-length` reports rows that
		// merely disagree in width, which the spec permits and nu-validator reports as a
		// warning; its default severity stays `warning` to match.
		'no-table-cell-overlap': true,
		'no-table-span-overflow': true,
		'no-empty-table-track': true,
		'consistent-table-row-length': true,
		'no-unknown-role': true,
		'no-abstract-role': true,
		'permitted-roles': true,
		'require-aria-prop': true,
		'no-prohibited-naming': true,
		'element-supports-aria-prop': true,
		'role-supports-aria-prop': true,
		// ARIA in HTML §6: native HTML attributes MUST take precedence over a contradicting ARIA
		// equivalent — a real conformance violation, and no-contradictory-aria-prop already
		// defaults to 'error' for it. Merely redundant (same-value) aria-* is a should-level
		// style preference, not something nu-validator flags, so no-redundant-aria-prop
		// (warning by default) is intentionally not enabled here.
		'no-contradictory-aria-prop': true,
		// ARIA §childrenArePresentational: nu-validator treats a descendant with an explicit
		// non-presentational role/semantics inside a role with presentational children as an
		// outright parse error (e.g. `role="button"` nested under `role="separator"`), even
		// though this rule's user-facing default stays 'warning' (non-normative — the ARIA
		// section itself is a MAY/SHOULD, not a MUST). Escalated here purely for bench alignment.
		'no-aria-on-presentational-children': { severity: 'error' },
		// ARIA in HTML §3: "Authors MAY use the aria-hidden attribute on any HTML element that
		// allows global aria-* attributes, with the exception of focusable elements and the body
		// element." The rule enforces this transitively via WAI-ARIA §Including Elements in the
		// Accessibility Tree: a focusable descendant of an aria-hidden ancestor remains in the
		// accessibility tree, so aria-hidden is ineffective and effectively conflicts with the
		// focusable-element exception. The user-facing default stays 'warning' because the
		// remediation is a UX-shape choice (remove aria-hidden vs. remove focus), not a purely
		// mechanical fix; the bench escalates to align with the ARIA-in-HTML MUST NOT.
		'no-focusable-in-aria-hidden': { severity: 'error' },
		// ARIA in HTML §att-hidden: "authors MUST NOT use aria-hidden=\"true\" on any element
		// which also has the hidden attribute specified in the Hidden Until Found state."
		'no-aria-hidden-on-hidden-until-found': true,
		'no-invalid-aria-prop-value': true,
		'require-owned-elements': true,
		'require-parent-role': true,
		'aria-prop-requires-role': true,
		// WAI-ARIA 1.3 §tab role: "Authors MUST ensure that if a tab is active, a
		// corresponding tabpanel that represents the active tab is rendered."
		'tab-requires-tabpanel': true,
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
				'no-restricted-element': [
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
