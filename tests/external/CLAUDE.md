# tests/external — nu-validator Coverage Benchmark

Measures markuplint's HTML / ARIA conformance coverage against the
`validator/validator` HTML test corpus, with nu-validator running on
the same fixtures as a reference signal.

Operating policy (not derivable from code):

- Subject of measurement is **markuplint**; nu-validator is reference
  only. Authority is always the spec (HTML LS / WAI-ARIA / URL LS) —
  when nu disagrees with the spec, record a spec-cited
  `excluded-ids.json` entry (`nu-over`), do not match nu.
- CI touchpoints are partial: the bench's own unit specs
  (`tests/external/bench/*.spec.ts`) run in the normal `yarn test` job,
  and `.github/workflows/bench-xref-audit.yml` fails on CLOSED-issue
  references (PRs touching `issue-xref.config.ts`, plus a weekly cron).
  Snapshot capture and the nu comparison itself are NOT in CI — they
  are a maintainer-facing audit tool; evidence source for coverage
  decisions and release checklists.
- Raw `snapshots/{nu-validator,markuplint}/**` are gitignored and
  regenerate locally (`yarn bench:update`, needs Docker).
- nu-validator output is **non-deterministic under parallel
  execution** — pass `concurrency: 1` when reproducibility matters
  (see the JSDoc in `bench/run-nu-validator.ts`).
- `yarn bench:generate-spec` writes spec files under
  `tests/external/spec/`, verified by `yarn bench:verify`
  (`vitest.nu-validator.config.ts`) — this does NOT run as part of
  `yarn test`.
- When diff results surprise you, check `snapshots/diff/meta.json`
  first (submodule SHA, nu image digest, markuplint version, Node
  version).

Operating phase: the `nu-only` backlog reached **zero on 2026-08-13**;
the bench is in steady-state operation. The standing invariant is that
`snapshots/diff/nu-only.json` stays empty after every refresh — a new
entry is a regression, a stale exclusion, or new upstream coverage,
never a backlog item to sit on (`bench-maintain` has the decision
tree). "nu-only = 0" is a verdict-classification statement, not a
feature-completeness claim: `deferred-<spec>` markers in
`excluded-ids.json` park out-of-scope specs behind OPEN tracking
Issues.

The per-fixture operation is unchanged: read the spec and drive the
verdict to `match-error`, `match-clean`, or `nu-over` by either fixing
markuplint or recording an `excluded-ids.json` entry (`bench-triage`).

First-time environment setup (Docker, submodule, snapshots) is covered
by `README.md` here and the `bench-setup` skill.

## Tasks → skills

| Task                                                                                            | Skill                |
| ------------------------------------------------------------------------------------------------ | -------------------- |
| Follow up a nu-validator update (submodule / engine); regression-check after markuplint changes | `bench-maintain`     |
| Triage a `nu-only` fixture; audit a coverage claim                                              | `bench-triage`       |
| First-time setup, Docker / submodule trouble, repopulating raw snapshots                        | `bench-setup`        |
| New preset virtual rule (`nodeRules`) not firing on the bench                                   | `bench-virtual-rule` |
| Enable a flat rule on the bench, or override its severity                                       | `bench-rule-enable`  |
| Sync `<!-- bench-xref -->` blocks onto GitHub Issue bodies; pre-release checklist               | `bench-xref`         |
