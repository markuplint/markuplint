---
name: bench-triage
metadata:
  internal: true
description: >
  Triage one nu-only fixture from tests/external/snapshots/diff/nu-only.json
  by reading the spec, then drive its verdict to match-error, match-clean,
  or nu-over by either fixing markuplint or recording an excluded-ids.json
  entry. The core per-fixture operation of the nu-validator coverage
  benchmark. Use when a bench refresh surfaces new nu-only entries,
  when checking a coverage-claim ("markuplint misses X" /
  "over-detects Y") against the bench, or when classifying a specific
  fixture.
  Trigger keywords: nu-only, ml-only, coverage gap, bench triage,
  verdict, match-error, match-clean, nu-over, excluded-ids,
  declare nu over-detection, claim audit, audit fixture,
  mark-up valid per spec, spec-cited exclusion.
---

# nu-validator Bench Triage Skill

Take one nu-only fixture and drive its verdict to a confirmed state.

Every entry this skill sees is fresh intake — surfaced by a bench
refresh after an upstream nu update or a markuplint change. Deciding
*why* the entry appeared (new upstream coverage vs. stale exclusion
vs. markuplint regression) is `bench-maintain`'s decision tree; this
skill is the spec-read that settles the verdict once the entry is
confirmed as new coverage to classify.

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

A verdict tally (`ml-only=32` for a category, the count line in a
`bench:xref` block) is a pointer, not evidence. It says how many
fixtures differ, not which rule or attribute differs or whether
markuplint or nu is the one following the spec. Before a tally is
quoted in an Issue or PR body, pick one or two representative
fixtures, regenerate their snapshots (`yarn bench:update --target
markuplint`, or run them through `mlTest()`), read
`snapshots/markuplint/<path>.json` `violations[]`, and confirm the
flagged rule and attribute are the ones the claim is about. An
`ml-only` count read as "markuplint over-detects" without that step
has produced Issues whose actual violations came from unrelated
rules.

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

For a `nu-only` fixture, the spec verdict gives a binary action.

Where a fix lands depends on the branch: the paths named throughout this skill (`packages/@markuplint/types`, `packages/@markuplint/html-parser`, …) are the `dev` line. On the v6 line the same behaviour may be implemented in the Rust workspace instead — locate the code before editing, and follow `crates/markuplint-rules/CLAUDE.md` for anything under `crates/`.

| Spec on the markup | Conclusion | Action |
| --- | --- | --- |
| **Forbidden (HTML LS / ARIA / URL LS)** | nu correct, markuplint has a coverage gap. | Add or extend a markuplint rule. Open an Issue if the work is non-trivial. After fix, `yarn bench:update:ml` — fixture should flip to `match-error`. |
| **Forbidden, but spec is outside markuplint's reference scope** (e.g. WICG draft, vendor extension) | nu is enforcing a spec that markuplint deliberately does not track. Open an Issue for future coverage AND record the messages in `excluded-ids.json` so the bench can focus on actionable HTML LS gaps. | Issue + `excluded-ids.json` pattern. Reason field must explicitly note `deferred-WICG / deferred-<spec>` so future readers can distinguish from regular nu-over. The tracking Issue # goes in the reason. |
| **Permitted by HTML LS** | nu over-detecting. | Record in `excluded-ids.json` (per-ID or pattern; see below). After edit, `yarn bench:compare` — fixture should flip to `nu-over`. |
| **Ambiguous / under discussion** | Spec issue or PR ongoing. | Put the spec-tracker URL in the `reason` of the markuplint tracking Issue's `secondary` mapping in `tests/external/bench/issue-xref.config.ts` (file or find that Issue first — a mapping is keyed by its number). `summary.md` is regenerated on every `bench:report`, so a note there is lost. Do not silently close. |

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

Message-substring conclusions are kept in the [audit log](audit-log.md);
check it before excluding by message.

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
spec data files, helper libraries — every reference must be verified
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

Each row of [audit-log.md](audit-log.md) is a conclusion reached by reading the cited paragraph
directly. Do not add a row without a verbatim spec quote and source URL.

Rows persist even after markuplint gains coverage — the third column
becomes an evidence trail, and the "Verdict" cell is edited in place
(e.g. **nu over-detection** → **nu correct** — markuplint coverage
extended in ...) rather than the row being deleted. The only removal
case is a factually wrong row on a spec re-read; leave a
`~~strikethrough~~` retraction line rather than a silent delete so the
audit trail stays complete.

A substring not listed in `audit-log.md` is **unclassified** — do not
exclude without first adding a row with a spec quote.

## Deferred specs

Markers of the form `deferred-<spec>` in
`excluded-ids.json#entries[].reason` (or `patterns[].reason`) mean:
nu-validator is enforcing a spec that markuplint's tracked scope
(HTML LS / WAI-ARIA / URL LS) does not currently cover. Every marker
carries a tracking Issue, so future implementation work can locate
the entries via `grep -r 'deferred-<spec>'`.

| Marker | Spec | Tracking Issue | Fixture count | Rationale |
| --- | --- | --- | --- | --- |
| `deferred-CSS` | [CSS Syntax Level 3](https://www.w3.org/TR/css-syntax-3/) + property registry | #3946 | 1 | CSS grammar and property registry are outside markuplint's tracked scope (HTML LS + WAI-ARIA + URL LS). css-tree already a dependency for `MediaQueryList` / `SourceSizeList`, plausible future foundation for syntax-only validation. |

Add a row when opening a new `deferred-<spec>` Issue. The fixture
count comes from `yarn bench:xref --issue <N>` (verdict tally line
in the composed block).

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
