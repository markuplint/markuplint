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
		issue: 3829,
		filter: /^html\/attributes\/lang\/(extlang-bad|invalid-primary)-novalid/,
		note: 'HTML LS §3.2.6.2 The lang and xml:lang attributes: "the value must be a valid BCP 47 language tag". RFC 5646 §2.2.9 item 2: "Either the tag is in the list of grandfathered tags or all of its primary language, extended language, script, region, variant, and extension subtags appear in the IANA Language Subtag Registry as of the particular registry date". markuplint\'s `BCP47` type checker (`@markuplint/types/src/rfc/is-bcp-47.ts`) wraps the `bcp-47` npm package, which only enforces the well-formed grammar and never consults the IANA subtag registry — so an unregistered primary subtag (`zzz`) and an unregistered extlang subtag (`smg` in `bat-smg`) both slip through. `bat-smg` is registered as a `redundant` (not `grandfathered`) tag, so the §2.2.9 grandfathered exception does not apply. Fix requires vendoring the IANA registry snapshot (or a wrapper package that does) into `@markuplint/types`.',
	},
	{
		kind: 'primary',
		issue: 3921,
		filter: /^html\/elements\/base\/preceded-by-(link|script)-novalid/,
		note: 'HTML LS §4.2.3 The base element: "A `base` element, if it has an `href` attribute, must come before any other elements in the tree that have attributes defined as taking URLs." `<link>`/`<script>` are metadata content, so `<base>` remains in `<head>` alongside them and `permitted-contents` does not fire. `head-element-order` treats `<base>` as an unlisted (highest-priority) entry in its default source-order list, so `<link>` (group 5) preceding `<base>` (group 8) also matches. A dedicated rule (`base-element-position`) is proposed.',
	},
	{
		kind: 'primary',
		issue: 3928,
		filter: /^html\/elements\/(a\/with-href-button-descendant|audio\/controls-in-button|picture\/(junk-noscript|junk-noscript-after-source-no-img|junk-video-before))-novalid/,
		note: "`permitted-contents` flattens transparent-model children out of the parent's content-model check entirely. `<a href>` inside `<button>` (both transparent-carrying interactive descendants) and `<video>` / `<noscript>` inside `<picture>` all slip past because the transparent element itself is dropped from the parent's selector evaluation. HTML LS §3.2.5.3 transparency defers only the *children* to the parent's model; the transparent element itself must still satisfy the parent's constraints. Fix requires reworking `represent-transparent-nodes.ts` to keep the transparent element in the flattened list.",
	},
	{
		kind: 'primary',
		issue: 3838,
		filter: /^html-aria\/(author-requirements\/(574|575|576|577)|misc\/(role-tab-with-no-role-tabpanel-novalid|summary-for-its-details-with-aria-(expanded|pressed)-novalid))/,
		note: 'Umbrella of 7 aria fixtures deferred from the aria-slice PR. All 7 are now `match-error`. Six flipped after Group 1 (author-requirements role chain: `wai-aria-required-owned-elements`) and Group 3 (summary heuristics: `spec.summary.jsonc#aria.properties.without`) landed. The last one, `role-tab-with-no-role-tabpanel-novalid` (Group 2, a role-pair authoring requirement — WAI-ARIA 1.3 §tab role: "Authors MUST ensure that if a `tab` is active, a corresponding `tabpanel` that represents the active `tab` is rendered."), flipped after the new `wai-aria-tab-requires-tabpanel` rule landed (resolves via `aria-controls`/`aria-labelledby` correspondence). All acceptance criteria met; safe to close.',
	},
	{
		kind: 'primary',
		issue: 3832,
		filter: /^html\/datatypes\/charset-invalid-novalid/,
		note: 'Issue body Case A — `<meta http-equiv="content-type" content="text/html; charset=not-a-charset">`. HTML LS [§4.2.5.3 Pragma directives — Encoding declaration state](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-type): "For meta elements with an http-equiv attribute in the Encoding declaration state, the content attribute must have a value that is an ASCII case-insensitive match for a string that consists of: \\"text/html;\\", optionally followed by any number of ASCII whitespace, followed by \\"charset=utf-8\\"." markuplint\'s `HTTPEquivContentType` checker (`packages/@markuplint/types/src/whatwg/check-http-equiv-content-type.ts`) validates the label shape only (`/^text\\/html;[\\t\\n\\f\\r ]*charset=[\\w.-]+$/i`), so unknown labels like `not-a-charset` slip through. Cases B (`url-empty-novalid`) and C (`sandbox-scripts-same-origin-haswarn`) from the same Issue are already resolved (`match-error` and `nu-over` respectively); this is the sole remaining fixture backing the Issue.',
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
		issue: 3944,
		filter: /^html\/elements\/img\/missing-alt-in-figure-novalid/,
		note: '[HTML LS "Requirements for providing text to act as an alternative for images"](https://html.spec.whatwg.org/multipage/images.html#alt) and its "Guidance for conformance checkers" subsection ([`images.html#guidance-for-conformance-checkers`](https://html.spec.whatwg.org/multipage/images.html#guidance-for-conformance-checkers)) enumerate the narrow exceptions under which `alt` may be omitted. The fixture has no `<figcaption>` inside the enclosing `<figure>`, so none of the omission conditions apply. `packages/@markuplint/rules/src/required-attr/index.spec.ts` `[required-attr-invalid-001]` demonstrates that markuplint\'s `required-attr` fires on `img` only via explicit `nodeRule` config; `packages/@markuplint/html-spec/src/spec.img.jsonc` defines `alt` as `{ "type": "Any" }` without a `required` flag or `requiredEither`. The current `requiredEither` grammar cannot express the exception-list shape from the spec — a new rule (working name `img-alt-required`) or a richer condition grammar is required.',
	},
	{
		kind: 'primary',
		issue: 3945,
		filter: /^html\/elements\/img\/usemap-invalid-reference-novalid/,
		note: '[HTML LS "Image maps — Authoring"](https://html.spec.whatwg.org/multipage/image-maps.html#authoring): "The `usemap` attribute, if specified, must be a valid hash-name reference to a `map` element." [HTML LS "Valid hash-name reference"](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference): the reference is a `#`-prefixed string that "exactly matches" a `name` attribute in the same tree (string-equal, case-sensitive). `packages/@markuplint/rules/src/map-id-name-match` covers the internal id/name consistency of `<map>` itself but does not validate `img[usemap]` → `<map name>` lookups. `no-refer-to-non-existent-id` targets `id`-typed attributes only, so `usemap` (declared as `HashName` in `spec.img.jsonc`) is out of its scope. Needs a new rule (working name `usemap-references-map`) shaped like `form-attr-references-form` / `input-list-references-datalist`. Follow-up: reconcile the `[map-id-name-match-invalid-002]` spec comment which claims `<map name>` is matched case-insensitively against `<img usemap>` — this contradicts the "exactly matches" wording verified above.',
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
