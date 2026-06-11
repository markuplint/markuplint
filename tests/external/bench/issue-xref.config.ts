/**
 * Config-as-code mapping from GitHub issue number to the benchmark fixture
 * pattern that backs (or fails to back) the issue's claim. Consumed by
 * `xref-issue.ts` to generate a `<!-- bench-xref:begin v1 -->` block at the
 * end of each issue body.
 *
 * Three kinds:
 * - `primary`   — fixtures exist; filter + (optional) note + (optional)
 *                 `bodyOverride` that replaces the issue body before the
 *                 xref block is appended.
 * - `secondary` — no matching fixture in the current nu-validator suite;
 *                 write a stub explaining why.
 * - `umbrella`  — a meta issue. xref block renders a triage table for the
 *                 primary issues listed in `primaryIssues`.
 */

export type PrimaryMapping = {
	readonly kind: 'primary';
	readonly issue: number;
	readonly filter: RegExp;
	readonly note?: string;
	/**
	 * Factory that returns the full replacement body. Lazy so importing the
	 * config module does not touch the filesystem just to register the
	 * mapping — only builds that actually render the primary block call
	 * through. Reading from a co-located `.md` file is the recommended
	 * pattern; recreate `tests/external/bench/issue-xref/<name>.md` if needed.
	 */
	readonly bodyOverride?: () => string;
};

export type SecondaryMapping = {
	readonly kind: 'secondary';
	readonly issue: number;
	readonly reason: string;
};

export type UmbrellaMapping = {
	readonly kind: 'umbrella';
	readonly issue: number;
	/**
	 * Explicit roll-up list. Omit to auto-derive from every `primary`
	 * mapping in the config — preferred, because manual lists drift every
	 * time a new primary issue is added.
	 */
	readonly primaryIssues?: readonly number[];
};

export type XrefMapping = PrimaryMapping | SecondaryMapping | UmbrellaMapping;

export const xrefMappings: readonly XrefMapping[] = [
	// === 1 次群: bench で裏取れる Issue ===
	{
		kind: 'primary',
		issue: 293,
		filter: /html-svg\/filters-/,
		note:
			'`ml-only` fixtures here are all W3C SVG 1.1 test-suite files; their violations are `deprecated-attr` / `invalid-attr` / `permitted-contents` on SVG 1.1 remnants (`version`, `baseProfile`, `xmlns:xlink`, `<font-face>` inside `<defs>`, `font-family` with a custom family), not on filter references. markuplint is spec-correct under SVG 2; nu-validator is lax on these SVG 1.1 features. The proposed `svg-filter-reference-relationship` rule is unrelated and not blocked by this noise.',
	},
	{
		kind: 'primary',
		issue: 3844,
		filter: /^html\/parser\//,
		note:
			'Two distinct gaps surface here: (A) `parse5` onParseError signals (HTML LS §13.2.5 tokenizer errors — bogus comment/doctype, EOF inside comment/doctype/system-id, character-reference malformations, U+0000/U+000B forbidden code points, unquoted-attr edge cases) are not surfaced as violations by `@markuplint/html-parser`; (B) `isDocumentFragment` heuristic treats any source not starting with `<!doctype html>` or `<html>` as a fragment, so the `doctype` rule skips full documents that begin with `<meta>`/`<title>` (`no-doctype`, `eof-without-doctype`, `bogus-doctype`, `nameless-doctype`, etc.). Closing both is a prerequisite for completing nu-validator parser-error coverage.',
	},
	{
		kind: 'primary',
		issue: 3848,
		filter: /^html\/(invalid-attr|microdata\/(itemid|itemtype))\//,
		note:
			'URL Living Standard validator implementation. Largest single residual: 1246 nu-only fixtures (invalid-attr 1177 + microdata/itemid 39 + microdata/itemtype 30). Single implementation project in `packages/@markuplint/types/src/whatwg/check-url.ts` unlocks all of them at once. Confirmed nu-correct error categories (per bench-triage SKILL audit log): invalid-credentials, special-scheme-missing-following-solidus, invalid-reverse-solidus, invalid-URL-unit, file-invalid-Windows-drive-letter.',
	},
	{
		kind: 'primary',
		issue: 3849,
		filter: /^html-math\//,
		note:
			'MathML Core content model constraints. 12 fixtures (mfrac/mover/mroot/msub/msup/msubsup/munder/munderover arity, mprescripts/mtr/annotation parent restrictions, math-in-head). Per-element spec data files already exist as `spec.mml_*.jsonc` (32 files); the gap is expressing arity / parent constraints inside them. `spec.svg_a.jsonc` is the conditional-branch precedent.',
	},
	{
		kind: 'primary',
		issue: 3850,
		filter: /^html\/media-queries\//,
		note:
			'CSS Media Queries Level 4/5 syntax validation in `media=` attribute. 13 fixtures (unrecognized media, missing units, deprecated features). Add a new typed checker under `packages/@markuplint/types/src/whatwg/` following the `check-mime-type` / `check-link-type` pattern.',
	},
	{
		kind: 'primary',
		issue: 3851,
		filter: /^html\/mime-types\//,
		note:
			'MIME type quoted-string parameter parsing. 2 fixtures (unfinished quoted string in `text/html;charset="..."`). Extend the existing `packages/@markuplint/types/src/whatwg/check-mime-type.ts` to validate parameter quoted-string termination per RFC 9110 §5.6.6.',
	},
	{
		kind: 'primary',
		issue: 3852,
		filter:
			/^(html\/microdata\/(itemprop-not-in-item|itemref-redundant|itemtype-empty)|html\/elements\/(link|meta)\/itemprop-with-)/,
		note:
			'Microdata semantic constraints. 5 fixtures: itemprop without itemscope ancestor (HTML LS §5.2.3 attribute def + §5.2.5 conformance constraint) — covers `html/microdata/itemprop-not-in-item` plus the bonus `html/elements/link/itemprop-with-rel` and `html/elements/meta/itemprop-with-name` orphan cases — duplicate ids in itemref (§5.2.2 Items), empty itemtype value (§5.2.2 Items). Distinct from the URL-syntax work in #3848.',
	},

	// === 2 次群: bench では裏取れない Issue（ステルブロック） ===
	{
		kind: 'secondary',
		issue: 3675,
		reason:
			'Internal merge-order blocker; not a benchmark claim. Resolves once dev merges into the branch and the SRIHash type comes along.',
	},
	{
		kind: 'secondary',
		issue: 263,
		reason: 'No fixture in the nu-validator suite probes dynamic `input[type]` attribute evaluation.',
	},
	{
		kind: 'secondary',
		issue: 509,
		reason:
			'Parser-level concern (ignore preprocessor blocks inside attribute tokens). The nu-validator suite contains no preprocessor fixtures.',
	},
	{
		kind: 'secondary',
		issue: 296,
		reason:
			'No fixture covers the `<svg><title>` accessibility requirement in the nu-validator suite.',
	},
	{
		kind: 'secondary',
		issue: 359,
		reason: 'Proposed new rule; no fixture in the nu-validator suite probes case-sensitive attribute values.',
	},
	{
		kind: 'secondary',
		issue: 358,
		reason: 'Proposed new rule; no fixture in the nu-validator suite probes whitespace inside attribute values.',
	},
	{
		kind: 'secondary',
		issue: 460,
		reason:
			'`permitted-content` on elements containing mutable (preprocessor) children is a markuplint-internal concern; the nu-validator suite has no fixtures with mutable placeholders.',
	},
];
