---
name: bench-triage
metadata:
  internal: true
description: >
  Triage one nu-only fixture from tests/external/snapshots/diff/nu-only.json
  by reading the spec, then drive its verdict to match-error, match-clean,
  or nu-over by either fixing markuplint or recording an excluded-ids.json
  entry. The core operation of the nu-validator coverage benchmark.
  Use when reducing the nu-only backlog, when checking a coverage-claim
  ("markuplint misses X" / "over-detects Y") against the bench, or when
  classifying a specific fixture.
  Trigger keywords: nu-only, ml-only, coverage gap, bench triage,
  verdict, match-error, match-clean, nu-over, excluded-ids,
  declare nu over-detection, claim audit, audit fixture,
  reduce nu-only, mark-up valid per spec, spec-cited exclusion.
---

# nu-validator Bench Triage Skill

Take one nu-only fixture and drive its verdict to a confirmed state.
Repeat to reduce the nu-only backlog.

Prerequisite: the bench must be runnable on this machine. If commands
in this skill fail with "no snapshots found" / Docker errors, run
the `bench-setup` skill first.

## Verdict definitions

| Verdict | Meaning |
| --- | --- |
| `match-error` | Both tools detected a violation. |
| `match-clean` | Neither detected a violation (and no nu errors were excluded). |
| `ml-only` | Only markuplint detected. |
| `nu-only` | Only nu-validator detected, and `excluded-ids.json` does not cover the messages. |
| `nu-over` | Only nu-validator detected, but every message is covered by `excluded-ids.json`. |

`nu-only` is what this skill drives. `ml-only` is informational and
not this skill's target — but if you need to understand it, see
"Note: ml-only readings" at the end.

## Step 1: Pick a fixture

Slice `tests/external/snapshots/diff/nu-only.json` (`entries[]` with
`category` and `path`) by path or category. When auditing a coverage
claim instead, slice `coverage.json` by the claim's pattern and read
each entry's `verdict`.

## Step 2: Read nu-validator messages for the fixture

Read `tests/external/snapshots/nu-validator/<path>.json`
(`nuValidator.messages[]`). The raw tree is gitignored — regenerate
with `yarn bench:update --target nu` if missing. Each message has a
stable `id` (`nv-<hex12>`, optionally `-N` on collisions); that's
the key for `excluded-ids.json`.

## Step 3: Read markuplint output for the fixture

Read `tests/external/snapshots/markuplint/<path>.json`
(`markuplint.violations[]`). For a `nu-only` fixture, expect zero
violations here. If markuplint already detected something, the
verdict computation may be stale — re-run `yarn bench:compare`.

## Step 4: Read the spec

Open the raw HTML at `tests/external/validator/tests/<path>` and
identify the relevant spec paragraph. Authoritative sources:

- HTML LS — <https://html.spec.whatwg.org/multipage/>
- DOM LS — <https://dom.spec.whatwg.org/>
- URL LS — <https://url.spec.whatwg.org/>
- WAI-ARIA 1.3 — <https://www.w3.org/TR/wai-aria-1.3/>
- ARIA in HTML — <https://w3c.github.io/html-aria/>
- Microdata (HTML LS §5.7) — <https://html.spec.whatwg.org/multipage/microdata.html>

MDN is not authoritative — quote WHATWG / W3C when they disagree.
Living standards change; recent normative revisions often explain
why nu (slow) and markuplint (tracks `@markuplint/html-spec`) drift.

Quote the exact sentence verbatim into the issue / PR /
`excluded-ids.json#reason` — never a paraphrase.

## Step 5: Decide and act

For a `nu-only` fixture, the spec verdict gives a binary action:

| Spec on the markup | Conclusion | Action |
| --- | --- | --- |
| **Forbidden (HTML LS / ARIA / URL LS)** | nu correct, markuplint has a coverage gap. | Add or extend a markuplint rule. Open an Issue if the work is non-trivial. After fix, `yarn bench:update:ml` — fixture should flip to `match-error`. |
| **Forbidden, but spec is outside markuplint's reference scope** (e.g. WICG draft, vendor extension) | nu is enforcing a spec that markuplint deliberately does not track. Open an Issue for future coverage AND record the messages in `excluded-ids.json` so the bench can focus on actionable HTML LS gaps. | Issue + `excluded-ids.json` pattern. Reason field must explicitly note `deferred-WICG / deferred-<spec>` so future readers can distinguish from regular nu-over. Tracking Issue # MUST be in the reason. |
| **Permitted by HTML LS** | nu over-detecting. | Record in `excluded-ids.json` (per-ID or pattern; see below). After edit, `yarn bench:compare` — fixture should flip to `nu-over`. |
| **Ambiguous / under discussion** | Spec issue or PR ongoing. | Note the spec-tracker URL in `snapshots/diff/summary.md` follow-up. Do not silently close. |

markuplint's reference scope is HTML Living Standard + WAI-ARIA +
URL Living Standard. Anything nu enforces from a WICG draft, a
vendor extension, or any other spec outside that set is treated
as deferred coverage — eligible for `excluded-ids.json` only if
an Issue tracks the future implementation.

When the spec disagrees with **both** tools (recent normative
revision neither has adopted), open one Issue per tool but pursue
only the markuplint side from this repo — nu upstream reports are
not part of this project's workflow.

### How to record nu over-detection

Follow the existing entry shapes in `excluded-ids.json` (per-`id`
`entries[]` keyed by the nu message id; message-substring
`patterns[]` keyed by `messageContains`). Every entry needs a
`reason` containing the verbatim spec quote, plus `addedAt` /
`addedBy`.

The verdict flips to `nu-over` only when *every* active nu message
on the fixture is covered. Partial coverage stays `nu-only`.

`specUrl` is required on both `entries[]` and `patterns[]`. Every
exclusion must cite a spec paragraph (HTML LS / WAI-ARIA / URL LS /
similar). If no spec paragraph can be cited, do not exclude — file an
Issue to track the future markuplint coverage instead. When the same
diagnostic hits many fixtures, use `patterns[]` instead of dozens of
per-`id` entries.

Patterns trade compactness for stability: per-`id` entries pin the
nu message-ID hash, so a wording shift in nu surfaces as a stale
entry on the next bench refresh (the entry stops matching and the
fixture reappears in `nu-only`). Patterns key on message text, so
a wording shift silently drops them out of effect. For deferred-spec
batches (10+ fixtures driven by an Issue), prefer patterns but record
the expected `nu-over` headcount in the reason field so pre-release
bench refreshes can spot drift.

After editing `excluded-ids.json`:

```
yarn bench:compare
yarn bench:generate-spec
yarn bench:report
```

## Step 6: Pin against `--concurrency 1` before filing

nu-validator is non-deterministic under parallel load. Before
landing a coverage Issue or an `excluded-ids.json` entry, confirm
the verdict survives a deterministic run:

```
yarn bench:update --target nu --concurrency 1 --filter '<the/fixture>'
yarn bench:compare
```

If the verdict flipped, the original observation was parallel-run
flicker, not a real signal.

## Step 7: Fact-check the Issue body before filing

When the verdict points at "open or extend an Issue" and the Issue
body cites specific repository assets — file paths, package names,
spec data files, helper libraries — every reference MUST be verified
to exist in the current tree before the Issue is filed. Implementers
read the Issue first; a wrong path sends them to a dead end.

Required pre-filing checks:

1. **File paths**: every quoted path resolves (`ls <path>` or open in editor).
2. **"Add new file" claims**: confirm the file is actually missing
   (`find packages/... -name '<pattern>'`). If a file with the same
   role already exists, change the wording to "extend" instead of
   "add" and list the existing files explicitly.
3. **Recommended npm libraries**: package exists and is currently
   maintained (`npm view <pkg>` or check the npm/registry page).
   Do not write `(or similar)` placeholders.
4. **Spec section numbers**: dereference the cited URL once before
   pasting; section numbers shift between drafts.
5. **bench-xref registration**: when the Issue is `primary` (i.e.,
   bench fixtures back its claim), add a mapping in
   `tests/external/bench/issue-xref.config.ts` so `bench-xref` keeps
   the body in sync on each release-prep cycle.

Skipping any of these is the same failure mode as filing without a
spec quote: it pollutes the inventory with stale or false references
that other agents and humans will then act on. Treat it as a hard
gate, not a polish step.

## Audit log of message-substring decisions

Each row is a conclusion reached by reading the cited paragraph
directly. Do not add a row without a verbatim spec quote and source URL.

| Message substring | Verdict | Source |
| --- | --- | --- |
| `Fragment is not allowed for data: URIs according to RFC 2397` | **nu over-detection** — excluded in `patterns[]` | URL LS §4.3: a `valid URL string` may end in a fragment for any scheme. |
| `must be less than or equal to` (meter / progress / input min/max) | **nu correct** — markuplint coverage in `meter-value-bounds` (meter) and `progress-value-bounds` (progress: `value ≤ max`, or `value ≤ 1` when `max` is absent). Input min/max still uncovered. | HTML LS §4.10.14 (meter): "minimum ≤ value ≤ maximum; minimum ≤ low ≤ maximum (if low is specified); …" — explicit `must`. HTML LS §4.10.14 (progress): "If both attributes are present, the value of the value attribute must be less than or equal to the value of the max attribute. If only the value attribute is present, its value must be less than or equal to one." |
| `URL includes credentials` | **nu correct** — NOT excluded | URL LS §1.1 `invalid-credentials`. HTML LS requires a valid URL string, so a URL validation error is a conformance error. |
| `Expected a slash` (special-scheme URLs missing `//`) | **nu correct** — NOT excluded | URL LS `special-scheme-missing-following-solidus`. |
| `Backslash used as path segment delimiter` | **nu correct** — NOT excluded | URL LS `invalid-reverse-solidus`. |
| `Illegal character in …` (path / fragment / domain / port) | **nu correct** — NOT excluded | URL LS `invalid-URL-unit` covers non-URL code points and malformed percent-encoding. |
| `Windows drive letter uses …` | **nu correct** — NOT excluded | URL LS `file-invalid-Windows-drive-letter` / `file-invalid-Windows-drive-letter-host`. |
| `Expected a space character` / `Expected an unquoted URL` (`<meta http-equiv="refresh">` content) | **nu over-detection** — excluded per-ID in `entries[]` | HTML LS §4.2.5.3 Refresh grammar: clause 3.2 makes whitespace after `;`/`,` optional; clause 3.3 alt 2 accepts any valid URL. nu's wording overlaps with legitimate refresh errors, so substring-match is unsafe — per-ID. |
| `<script type=importmap>` scope key that fails a "looks-like-URL" check (e.g. `scope1_not_url`) | **nu over-detection** — excluded per-ID in `entries[]` | HTML LS § Sorting and normalizing scopes step 2: scopePrefix is URL-parsed *with* baseURL. Relative strings parse successfully against any base, so step 3's "URL parse failure" warning never fires. nu requires the key to *look* URL-like (scheme or `/`/`./`/`../`); spec doesn't. |
| `<script type=module … defer>` or any non-external script with `blocking` | **nu correct** — markuplint coverage extended in `spec.script.jsonc` | HTML LS §4.12.1 attribute applicability table: `defer` is "Yes" only for external classic; `blocking` is "Yes" only for external classic + external module. Other script kinds (any module + defer, inline scripts + blocking, importmap, speculation rules, data block) are "·" (not applicable). markuplint now flags these via `invalid-attr` instead of relying on `ineffective-attr`'s warning. |
| `<script>` with `crossorigin`/`referrerpolicy`/`fetchpriority`/`src`/`nomodule` on importmap / speculationrules / data block, or `fetchpriority` on inline scripts | **nu correct** — markuplint coverage extended in `spec.script.jsonc` | HTML LS §4.12.1: "Which other attributes may be specified on a given script element is determined by the following table" — the table permits `crossorigin`/`referrerpolicy` only for classic + module scripts (external or inline), `fetchpriority`/`integrity`/`blocking` only for external classic + external module, `nomodule` only for classic; `src` "must only be specified for classic scripts and JavaScript module scripts". Classic-script detection enumerates the 16 JavaScript MIME type essence strings (mimesniff) plus omitted/empty `type`, because "data block" (any other `type` value) is not expressible as a finite negative selector list. The old `:not([type='importmap' i])`-style conditions could not catch data blocks. The global-attr override that #3648 reverted is safe now: the per-element merge in `ml-spec` `get-attr-specs-spec.ts` (`{...current, ...attr}`) preserves the enum type when the element entry specifies only `condition` — pinned by tests `invalid-attr-issue-3631-032`/`-033`. |
| `<source srcset="…w">` inside `<picture>` without a `sizes` attribute (and no lazy fallback) | **nu correct** — markuplint coverage extended in `srcset-sizes-constraint` Check 5b | HTML LS § source: with width descriptors, `sizes` "may" be present but **must** be present unless the following sibling `<img>` supports auto-sizes (`loading="lazy"`). Previously the rule's Check 5 only handled `<img>`. |
| `<img srcset="http: 1x">` and similar URL-LS-invalid candidate URLs | **nu correct** — markuplint coverage extended in `@markuplint/types` Srcset | URL LS rejects bare special-scheme fragments missing `//` (`special-scheme-missing-following-solidus`). The Srcset checker now parses each candidate's URL via WHATWG URL with a dummy `https://example.com/` base. |
| `sizes="-1px"` / `sizes="(min-width: 600px) -100px"` and similar negative `<source-size-value>` | **nu correct** — markuplint coverage extended in `@markuplint/types` SourceSizeList | HTML LS § sizes: `<source-size-value>` must be a non-negative `<length>`. css-tree's `<length>` grammar accepts negatives, so a post-syntax regex catches them at boundaries (start-of-list, after `,`, after the `)` closing a `<media-condition>`). |
| `A "source" element that has a following sibling "source" element or "img" element with a "srcset" attribute must have a "media" attribute and/or "type" attribute` / `Value of "media" attribute here must not be "all"` | **nu correct** — markuplint coverage extended in `srcset-sizes-constraint` Check 6 | [HTML LS § the source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element): "When a source element has a following sibling source element or img element with a srcset attribute specified, it must have at least one of the following: A media attribute specified with a value that, after stripping leading and trailing ASCII whitespace, is not the empty string and is not an ASCII case-insensitive match for the string 'all'. A type attribute specified." An always-matching first source shadows the following candidates. Applies even to a srcset-less source. Flipped 7 `picture/always-matching-*-novalid` fixtures nu-only → match-error. |
| `exceeded the column count established using column markup` (`<col>` + wider row) | **nu over-detection** — excluded per-ID in `entries[]` | [HTML LS §4.9.12.1 *Algorithm for processing rows* Step 7](https://html.spec.whatwg.org/multipage/tables.html#forming-a-table): "If xcurrent is equal to xwidth, then increase xwidth by 1." xwidth grows automatically when a row has more cells than the current column count established by column markup — extra columns are silently created and every column in this row still has an anchor cell, so neither Step 14 (overlap) nor Step 20 (no-anchor) is violated. The real `<col>`-related table model errors (rows narrower than column markup, dangling colspan, empty rows, etc.) are tracked at #3915. |
| `The "base" element must come before any "link" or "script" elements in the document.` | **nu correct** — markuplint coverage extended via `html-standard/no-base-after-link-or-script` virtual rule | [HTML LS §4.2.3 the base element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element): "A base element must come before any other elements in the tree that have attributes defined as taking URLs, except the html element (its manifest attribute isn't affected by base)." In `<head>` the URL-taking elements are `<link>` (href, imagesrcset) and `<script>` (src); a following-sibling `<base>` shadows its own effect on those references. Flipped `base/preceded-by-link-novalid` and `base/preceded-by-script-novalid` nu-only → match-error. |

The remaining `nu-only` bulk (URL parsing) is **not** for exclusion;
it represents real markuplint gaps for future coverage work. Any
substring not in the table is **unclassified** — do not exclude
without first adding a row with a spec quote.

## Note: ml-only readings (informational)

When you encounter `ml-only` while triaging, classify by both spec
verdict and markuplint rule intent:

- Rule intends strict spec-conformance + spec **forbids** the markup
  → markuplint correct, nu lax. Informational only (no upstream nu
  reports from this repo).
- Rule intends strict spec-conformance + spec **permits** the markup
  → markuplint false positive. Fix the rule.
- Rule intends to be stricter than the spec by design (best-practice
  / anti-pattern, e.g. flagging spec-permitted but discouraged
  markup) → working as intended. nu just doesn't share the stance.
  No action.

The bench config (`bench/config.ts`) curates a rule subset that maps
onto nu-validator capability. It is not guaranteed to be strict
spec-conformance only; some enabled rules legitimately go beyond the
spec letter (e.g. `link-types` defaults to a narrower rel set than
HTML LS registers). Always read the rule's documentation /
implementation before classifying an `ml-only`.

## Concurrency caveat

Parallel nu runs flicker on aria-owns and similar fixtures (state
shared across requests in nu's runtime). File-level verdict counts
stay stable across runs; individual messages do not. Use
`--concurrency 1` whenever you need a single fixture's output to
reproduce reliably.
