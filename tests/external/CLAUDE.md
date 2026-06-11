# tests/external — nu-validator Coverage Benchmark

Measures markuplint's HTML / ARIA conformance coverage against the
`validator/validator` HTML test corpus, with nu-validator running on
the same fixtures as a reference signal.

Operating policy (not derivable from code):

- Subject of measurement is **markuplint**; nu-validator is reference
  only. Authority is always the spec (HTML LS / WAI-ARIA / URL LS) —
  when nu disagrees with the spec, record a spec-cited
  `excluded-ids.json` entry (`nu-over`), do not match nu.
- Not wired into CI. Maintainer-facing audit tool; evidence source for
  coverage decisions and release checklists.
- Raw `snapshots/{nu-validator,markuplint}/**` are gitignored and
  regenerate locally (`yarn bench:update`, needs Docker).
- When diff results surprise you, check `snapshots/diff/meta.json`
  first (submodule SHA, nu image digest, markuplint version, Node
  version).

Central operation: pick one entry from
`tests/external/snapshots/diff/nu-only.json`, read the spec, and drive
its verdict to `match-error`, `match-clean`, or `nu-over` by either
fixing markuplint or recording an `excluded-ids.json` entry.

## Tasks → skills

| Task                                                                              | Skill               |
| --------------------------------------------------------------------------------- | ------------------- |
| Triage a `nu-only` fixture; audit a coverage claim                                | `bench-triage`      |
| First-time setup, Docker / submodule trouble, repopulating raw snapshots          | `bench-setup`       |
| New preset virtual rule (`nodeRules`) not firing on the bench                     | `bench-virtual-rule` |
| Enable a flat rule on the bench, or override its severity                         | `bench-rule-enable` |
| Sync `<!-- bench-xref -->` blocks onto GitHub Issue bodies; pre-release checklist | `bench-xref`        |
