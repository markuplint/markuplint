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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const overrideDir = join(dirname(fileURLToPath(import.meta.url)), 'issue-xref');

function loadBodyOverride(fileName: string): string {
	return readFileSync(join(overrideDir, fileName), 'utf8').trimEnd();
}

export type PrimaryMapping = {
	readonly kind: 'primary';
	readonly issue: number;
	readonly filter: RegExp;
	readonly note?: string;
	/**
	 * Factory that returns the full replacement body. Lazy so importing the
	 * config module does not touch the filesystem just to register the
	 * mapping — only builds that actually render the primary block call
	 * through.
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

// Body override for #3634: the original issue text framed the remaining
// `nu-only` fixtures as a missing markuplint feature, but the three
// constraints were already implemented in PR #3677 as preset virtual
// rules. The fixtures stayed `nu-only` until those rules were mirrored
// into `bench/config.ts`. The replacement body records that resolution
// path; lives in `issue-xref/3634-body.md` so it can be proof-read
// without escaping.

export const xrefMappings: readonly XrefMapping[] = [
	// === 1 次群: bench で裏取れる Issue ===
	{
		kind: 'primary',
		issue: 3634,
		filter:
			/meta.*multiple-charset|meta.*duplicate-charset|meta.*multiple-description|charset-and-(content-type|http-equiv)|multiple-visible-main|multiple-main-visible/,
		note:
			'All meta-uniqueness fixtures are `match-error` after PR #3677 introduced the preset virtual rules and the bench config mirrored their selectors. `<main>` uniqueness is covered separately by `no-duplicate-visible-main`.',
		bodyOverride: () => loadBodyOverride('3634-body.md'),
	},
	{
		kind: 'primary',
		issue: 3682,
		filter: /html-aria\/(misc|roles-plain-concrete|roles-properties-supported).*separator|warnings\/unnecessary-role-separator/,
		note:
			'`wai-aria-required-props` fires `aria-valuenow` on non-focusable separators here, which is over-detection: ARIA makes that property required only for focusable separators, so `html-spec` needs a conditional required flag. Note that some `ml-only` rows also include `wai-aria-disallowed-props` hits on `aria-expanded` — that half is spec-correct (nu is lax) and will stay `ml-only` after this fix.',
	},
	{
		kind: 'primary',
		issue: 3733,
		filter: /itemid-without-itemtype|itemid-without-itemscope|itemtype-without-itemscope/,
		note:
			'All six fixtures are `nu-only` — markuplint misses itemid/itemtype cross-attribute constraints. HTML LS §5.7 makes `itemid` require both `itemscope` and `itemtype`.',
	},
	{
		kind: 'primary',
		issue: 3735,
		filter: /aria-hidden-on-input-hidden|popovertarget-with-aria-expanded|aria-expanded-with-popovertarget/,
		note:
			'Two of three patterns (`input[type=hidden] aria-hidden`, `button[popovertarget] aria-expanded`) have `nu-only` fixtures and confirm the gap. `summary[role]` inside `<details>` has no fixture in the suite; keep the upstream manual check as the sole evidence for that third pattern.',
	},
	{
		kind: 'primary',
		issue: 293,
		filter: /html-svg\/filters-/,
		note:
			'`ml-only` fixtures here are all W3C SVG 1.1 test-suite files; their violations are `deprecated-attr` / `invalid-attr` / `permitted-contents` on SVG 1.1 remnants (`version`, `baseProfile`, `xmlns:xlink`, `<font-face>` inside `<defs>`, `font-family` with a custom family), not on filter references. markuplint is spec-correct under SVG 2; nu-validator is lax on these SVG 1.1 features. The proposed `svg-filter-reference-relationship` rule is unrelated and not blocked by this noise.',
	},

	// === 2 次群: bench では裏取れない Issue（ステルブロック） ===
	{
		kind: 'secondary',
		issue: 3740,
		reason:
			'Pretender (custom-element-as-HTML) is a markuplint-specific feature; the nu-validator fixture suite has no equivalent. Track via markuplint unit tests.',
	},
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

	// === Umbrella ===
	// `primaryIssues` omitted → auto-derived from the primaries above.
	// Adding a primary mapping automatically includes it in the roll-up;
	// no need to edit two places in lock-step.
	{
		kind: 'umbrella',
		issue: 3684,
	},
];
