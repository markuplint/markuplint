# tests/external — nu-validator Coverage Benchmark

Measures markuplint's HTML / ARIA conformance coverage against the
`validator/validator` HTML test corpus (5442 fixtures). nu-validator
runs alongside on the same fixtures and provides a reference signal
for what an experienced conformance checker detects, so that
markuplint's coverage gaps are visible.

Subject of measurement: **markuplint**. Reference: nu-validator.
Authority: the spec (HTML LS / WAI-ARIA / URL LS).
Not wired into CI — this is a maintainer-facing audit tool that
generates the evidence used in coverage decisions and release
checklists.

## Central operation

Pick one entry from `tests/external/snapshots/diff/nu-only.json`,
read the spec, and drive its verdict to one of the confirmed
states (`match-error`, `match-clean`, `nu-over`) by either fixing
markuplint or recording an `excluded-ids.json` entry. Repeat to
reduce the `nu-only` backlog.

Output artefacts (under `snapshots/`): `coverage.json`,
`markuplint-only.json`, `nu-only.json`, `nu-over.json`,
`summary.md`, plus `meta.json` (submodule SHA, nu image digest,
markuplint version, Node version — check first when diffs surprise
you). Raw `snapshots/{nu-validator,markuplint}/**` are gitignored.

## Tasks → skills

| Task | Skill |
| --- | --- |
| Triage a `nu-only` fixture; audit a coverage claim | `bench-triage` |
| First-time setup, Docker / submodule trouble, repopulating raw snapshots | `bench-setup` |
| New preset virtual rule (`nodeRules`) not firing on the bench | `bench-virtual-rule` |
| Enable a flat rule on the bench, or override its severity | `bench-rule-enable` |
| Sync `<!-- bench-xref -->` blocks onto GitHub Issue bodies; pre-release checklist | `bench-xref` |

## Architecture

```
validator/tests/**/*.html
         │
         ├──► Docker (ghcr.io/validator/validator) ──► nu-validator/*.json
         │
         └──► mlTest() (@markuplint rules)          ──► markuplint/*.json
                                                             │
                          excluded-ids.json ─────────────────┤
                                                             ▼
                                                       compare.ts
                                                             │
                              ┌──────────────────────────────┼───────────────────────────┐
                              ▼                              ▼                           ▼
                      coverage.json         markuplint-only.json               nu-only.json / nu-over.json
                              │                                                           │
                              │                                                           ▼
                              └──► generate-spec.ts ──► spec/nu-validator.spec.ts    report.ts ──► summary.md
```

nu-validator messages are keyed by stable `nv-<hex12>` IDs
(collision-disambiguated to `-1`, `-2`, …) hashed from path + type
+ message + first line/col. When nu's wording shifts, IDs shift —
intentional: stale `excluded-ids.json` entries automatically fall
out of scope and come back for review.
