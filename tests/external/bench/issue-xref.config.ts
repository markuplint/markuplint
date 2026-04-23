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
	readonly bodyOverride?: string;
};

export type SecondaryMapping = {
	readonly kind: 'secondary';
	readonly issue: number;
	readonly reason: string;
};

export type UmbrellaMapping = {
	readonly kind: 'umbrella';
	readonly issue: number;
	readonly primaryIssues: readonly number[];
};

export type XrefMapping = PrimaryMapping | SecondaryMapping | UmbrellaMapping;

// Body override for #3634: the original text listed 4 bullets and claimed
// "~9 missed errors". Bench data shows 5 missed (not 9) and `<main>`
// uniqueness is already detected by `no-duplicate-visible-main`. Text lives
// in `issue-xref/3634-body.md` so it can be proof-read without escaping.

export const xrefMappings: readonly XrefMapping[] = [
	// === 1 次群: bench で裏取れる 8 件 ===
	{
		kind: 'primary',
		issue: 3634,
		filter:
			/meta.*multiple-charset|meta.*duplicate-charset|meta.*multiple-description|charset-and-(content-type|http-equiv)|multiple-visible-main|multiple-main-visible/,
		note:
			'Visible `<main>` uniqueness is already covered by `no-duplicate-visible-main` (both fixtures are `match-error`). The remaining gap is meta uniqueness + charset/http-equiv coexistence.',
		bodyOverride: loadBodyOverride('3634-body.md'),
	},
	{
		kind: 'primary',
		issue: 3637,
		filter:
			/select\/button-with-(role|aria-label)|selectedcontent\/aria-hidden-in-select|dl-with-div-child-with-role|figure\/with-figcaption-and-role/,
		note:
			'All five patterns are already `match-error` in the benchmark — markuplint catches them today. No missed-error gap. This issue can be closed as already implemented.',
	},
	{
		kind: 'primary',
		issue: 3682,
		filter: /html-aria\/(misc|roles-plain-concrete|roles-properties-supported).*separator|warnings\/unnecessary-role-separator/,
		note:
			'`ml-only` rows here are markuplint over-detecting `aria-valuenow` on non-focusable separators. ARIA makes `aria-valuenow` required only for focusable separators; `html-spec` needs a conditional required flag.',
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
		issue: 3734,
		filter: /meta\/refresh-.*novalid/,
		note:
			'Five refresh-syntax fixtures are `nu-only`. `http-equiv="content-type"` syntax has no dedicated fixture in the current nu-validator suite — that half of the issue needs either a manual test or a new upstream fixture.',
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
		issue: 3619,
		filter: /html-svg\/(paths-data|masking-path|imp-path)/,
		note:
			'Direction is inverted. The issue asks for "missing validation", but 32 of the 34 `html-svg/paths-data` / `masking-path` fixtures are `ml-only` — markuplint currently rejects SVG path data that nu-validator (and the SVG spec) accept. The fix is to tighten the `<svg-path>` type into a real parser that stops emitting false positives, not to add more strict checks. Tracking the real work in a fresh issue; this one is closed as "not planned".',
	},
	{
		kind: 'primary',
		issue: 293,
		filter: /html-svg\/filters-/,
		note:
			'Before adding a new `svg-filter-reference-relationship` rule, clean up the existing `ml-only` fixtures in the SVG filters area — markuplint is already over-detecting there. Adding more strictness on top would compound the false-positive load.',
	},

	// === 2 次群: bench では裏取れない 8 件（ステルブロック） ===
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
	{
		kind: 'umbrella',
		issue: 3684,
		primaryIssues: [3634, 3637, 3682, 3733, 3734, 3735, 3619, 293],
	},
];
