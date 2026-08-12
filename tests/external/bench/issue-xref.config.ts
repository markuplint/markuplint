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
		note: '`ml-only` fixtures here are all W3C SVG 1.1 test-suite files; their violations are `deprecated-attr` / `invalid-attr` / `permitted-contents` on SVG 1.1 remnants (`version`, `baseProfile`, `xmlns:xlink`, `<font-face>` inside `<defs>`, `font-family` with a custom family), not on filter references. markuplint is spec-correct under SVG 2; nu-validator is lax on these SVG 1.1 features. The proposed `svg-filter-reference-relationship` rule is unrelated and not blocked by this noise.',
	},
	{
		kind: 'primary',
		issue: 3921,
		filter: /^html\/elements\/base\/preceded-by-(link|script)-novalid/,
		note: 'HTML LS §4.2.3 The base element: "A `base` element, if it has an `href` attribute, must come before any other elements in the tree that have attributes defined as taking URLs." `<link>`/`<script>` are metadata content, so `<base>` remains in `<head>` alongside them and `permitted-contents` does not fire. `head-element-order` treats `<base>` as an unlisted (highest-priority) entry in its default source-order list, so `<link>` (group 5) preceding `<base>` (group 8) also matches. A dedicated rule (`base-element-position`) is proposed.',
	},
	{
		kind: 'primary',
		issue: 3942,
		filter: /^html\/elements\/meta\/content-security-policy\//,
		note: 'CSP3 grammar (directive names, source-expression tokens, ASCII-only body) is a separate W3C specification. `packages/@markuplint/html-spec/src/spec.meta.jsonc` documents an explicit fall-through: "Other http-equiv values (default-style, content-security-policy) and `name` / `itemprop` fall through to `Any` at runtime." Three fixtures are recorded as `deferred-CSP` in `excluded-ids.json` and flip `nu-only` → `nu-over`; they will flip to `match-error` if/when a `ContentSecurityPolicy` type lands in `@markuplint/types` and is wired into `spec.meta.jsonc` under a new `[http-equiv=\'content-security-policy\' i]` condition.',
	},
	{
		kind: 'primary',
		issue: 3943,
		filter: /^(html-math\/math-in-head|html\/elements\/picture\/html-syntax-picture-no-end-tag|html\/parser\/(charset-after-1024|stray-start-tag|text-after-body))-novalid/,
		note: 'Umbrella for 5 fixtures that report legitimate HTML LS parse errors which `parse5` (`packages/@markuplint/html-parser/src/parser.ts` `tokenize()`) silently recovers from: `<math>` inside `<head>` triggering implicit body promotion; open `<picture>` at EOF; `<meta charset>` after the first 1024 bytes ([HTML LS "Specifying the document\'s character encoding"](https://html.spec.whatwg.org/multipage/semantics.html#charset)); a start tag or non-whitespace character after `</body>` ([HTML LS "The \'after body\' insertion mode"](https://html.spec.whatwg.org/multipage/parsing.html#the-after-body-insertion-mode)). A direct probe on the pinned parse5 version confirmed no `onParseError` fires for any of these fixtures. Extending `MLASTParseErrorCode` alone will not close the gap; a post-parse rule pass (per-case) is the pragmatic path.',
	},
	{
		kind: 'primary',
		issue: 3946,
		filter: /^html\/elements\/style\/css-property-error-novalid/,
		note: "CSS syntax and property registry are governed by CSS specifications (CSS Syntax Level 3, CSS Values and Units, individual property specs), not by HTML LS. markuplint's tracked spec scope is HTML LS + WAI-ARIA + URL LS per `.claude/skills/bench-triage/SKILL.md`, so CSS is `deferred-CSS`. One fixture is recorded per-id in `excluded-ids.json#entries[]` and flips `nu-only` → `nu-over`; it will flip to `match-error` if/when a CSS grammar-validation rule lands (css-tree, already a dependency of `packages/@markuplint/types`, is a plausible candidate for syntax-only validation). Parallel deferred spec: #3942 (deferred-CSP).",
	},
	// === 2 次群: bench では裏取れない Issue（ステルブロック） ===
	{
		kind: 'secondary',
		issue: 3675,
		reason: 'Internal merge-order blocker; not a benchmark claim. Resolves once dev merges into the branch and the SRIHash type comes along.',
	},
	{
		kind: 'secondary',
		issue: 263,
		reason: 'No fixture in the nu-validator suite probes dynamic `input[type]` attribute evaluation.',
	},
	{
		kind: 'secondary',
		issue: 509,
		reason: 'Parser-level concern (ignore preprocessor blocks inside attribute tokens). The nu-validator suite contains no preprocessor fixtures.',
	},
	{
		kind: 'secondary',
		issue: 296,
		reason: 'No fixture covers the `<svg><title>` accessibility requirement in the nu-validator suite.',
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
		reason: '`permitted-content` on elements containing mutable (preprocessor) children is a markuplint-internal concern; the nu-validator suite has no fixtures with mutable placeholders.',
	},
];
