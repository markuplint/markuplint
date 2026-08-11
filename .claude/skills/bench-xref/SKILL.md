---
name: bench-xref
metadata:
  internal: true
description: >
  Sync benchmark cross-reference blocks onto GitHub Issue bodies via
  `yarn bench:xref`, manage `tests/external/bench/issue-xref.config.ts`
  mappings, and run the pre-release checklist. Use when adding /
  removing / updating a primary or secondary mapping, when an issue
  closes upstream, when the xref CLI's output disagrees with what's
  on the issue body, or before cutting a release that touches a rule
  the benchmark covers.
  Trigger keywords: bench-xref, issue-xref, xref CLI, GitHub issue body,
  primary mapping, secondary mapping, umbrella block, pre-release
  checklist, bench-xref-audit workflow, marker version.
---

# nu-validator Bench Cross-Reference Sync Skill

Configured GitHub issues carry a
`<!-- bench-xref:begin v1 --> ... <!-- bench-xref:end -->` block at
the end of their body. The block lists every fixture matching the
issue's scope (filter regex) and the current verdict tally. Block
content is generated from `snapshots/diff/*` and is idempotent —
re-running only updates when the underlying numbers change.

Mappings live in `tests/external/bench/issue-xref.config.ts`.

## Commands

Flags (`--issue`, `--filter`, `--all`, `--write`, `--dry-run`,
`--audit`, `--json`) are parsed in
`tests/external/bench/xref-issue.ts` — read it when unsure. Without
`--write`, output goes to stdout and no network call is made.

Prerequisite: `gh` installed and authenticated.

Routine after a `yarn bench:update`:

```
yarn bench:xref --all --dry-run --write   # review intended diffs
yarn bench:xref --all --write             # apply
```

`composeBody` is idempotent and collapses multiple marker pairs
into one block.

The block does not adjudicate who is right between markuplint and
nu — that is a spec read per `bench-triage`.

## Updating `issue-xref.config.ts`

| Event | Action |
| --- | --- |
| New Issue this bench can verify | Add a `primary` mapping with a focused `filter`. Confirm with `yarn bench:xref --issue <N>`. |
| New Issue with no matching fixture | Add a `secondary` mapping with a `reason`. Internal-bug Issues go here too. |
| Existing Issue closes | Remove the entry. The umbrella block auto-derives from remaining primary mappings. |
| Issue scope shifts | Adjust `filter`. Rerun `yarn bench:xref --issue <N>`. |
| Body claim becomes inaccurate after bench reruns | Add or edit a `bodyOverride` factory. The recommended pattern (see its JSDoc in `issue-xref.config.ts`) is reading a co-located `.md` under `tests/external/bench/issue-xref/` — create that directory if it does not exist. |

## Pre-release checklist

Before cutting a markuplint release that touches any rule the
benchmark covers:

```
yarn bench:xref --audit     # prune CLOSED issues from the config
yarn bench:update           # regenerate coverage.json (Docker required)
yarn bench:xref --all --write
```

`--audit` is the cheapest gate; running it first prevents stale
xref blocks from being pushed to issues that closed between
releases.

## CI: `Bench xref audit` workflow

`.github/workflows/bench-xref-audit.yml` runs the audit on relevant
PRs and a weekly cron; it exits non-zero on any CLOSED entry,
blocking PR merge until the mapping is removed.

## Marker version

The `v1` literal is hard-coded in the `composeBody` regex. To break
format compat: bump `BEGIN_MARKER` / `END_MARKER` in
`xref-issue.ts`, temporarily widen the regex to accept both
versions, run `yarn bench:xref --all --write` once, then drop the
old version from the regex.
