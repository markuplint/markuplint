---
name: bench-maintain
metadata:
  internal: true
description: >
  Steady-state maintenance of the nu-validator coverage benchmark now
  that the nu-only backlog is zero: defend the invariants (nu-only = 0,
  orphan = 0, xref audit green), follow up a nu-validator upstream
  update (submodule bump / Docker image drift), and regression-check
  after markuplint rule or spec changes. Use when updating the
  validator submodule, when a bench refresh surfaces new nu-only
  entries, when excluded-ids entries go stale, or for the periodic
  health check. Trigger keywords: bench maintain, bench maintenance,
  nu update, submodule bump, validator update, bench refresh, nu-only
  regression, stale excluded-ids, image digest, steady state bench.
---

# nu-validator Bench Maintenance Skill

The nu-only backlog reached zero on 2026-08-13. From that point the
bench is in steady-state operation: the job is no longer to reduce a
backlog but to **defend invariants** across upstream updates and
markuplint changes. Per-fixture verdict work is still `bench-triage`;
environment recovery is still `bench-setup`; issue-body sync is still
`bench-xref`. This skill is the loop around them.

## Invariants to defend

After every full refresh, all of these must hold before committing:

| Invariant | Check |
| --- | --- |
| No unprocessed coverage gaps | `snapshots/diff/nu-only.json` has `"entries": []` |
| No untracked exclusions | every `excluded-ids.json` reason cites a spec URL and, for `deferred-*`, an OPEN tracking Issue |
| No stale issue mappings | `yarn bench:xref --audit` reports all mapped issues OPEN |
| nu ran clean | `snapshots/diff/nu-failures.json` is empty |

A new `nu-only` entry after a refresh is never noise to sit on — it is
one of exactly three things (see decision tree below), and each has an
owner action.

## Two upstream update axes

nu-validator updates reach the bench on two independent axes; know
which one moved before interpreting a diff (`snapshots/diff/meta.json`
records both — compare against the committed previous version):

- **Fixture corpus** — the `tests/external/validator` submodule
  (`submoduleSha` in meta.json). Moves only when you run
  `git submodule update --remote tests/external/validator`.
- **nu engine** — the Docker image. `bench/docker.ts` pulls
  `ghcr.io/validator/validator:latest` and resolves it to an immutable
  digest (`nuValidatorImage` in meta.json) at each
  `yarn bench:update` / `--target nu` run. The engine therefore drifts
  implicitly whenever upstream publishes, even with an unchanged
  submodule.

Because the engine follows `:latest`, a "routine" full refresh can
change verdicts by itself. That is expected — the digest in meta.json
is the audit trail.

## nu update follow-up procedure

1. Bump the fixture corpus (skip to step 2 for an engine-only refresh):

   ```
   git submodule update --remote tests/external/validator
   ```

2. Full refresh (Docker required; pulls the current engine):

   ```
   yarn bench:update
   ```

3. Diff `snapshots/diff/meta.json` against the committed version:
   which axis moved (`submoduleSha`, `nuValidatorImage`), and do the
   totals (`totalFilesNu`, `totalNuMessages`) shift plausibly with it?

4. Classify every new `nu-only.json` entry — three causes, three
   actions:

   | Cause | How to recognize | Action |
   | --- | --- | --- |
   | New upstream fixture or new nu check | Path is new to the corpus, or the message id is new on an old fixture | Run `bench-triage` on it (spec read → rule fix, Issue, or exclusion). This is the normal intake path for new coverage. |
   | Stale per-`id` exclusion | Fixture was `nu-over`; its `excluded-ids.json` entry no longer matches because nu changed the message wording (the `nv-<hex12>` hash is derived from the message) | Re-read the entry's spec citation; if the conclusion still holds, re-pin the new id (keep the reason, update `addedAt`). If nu's new wording changes the substance, re-triage from scratch. |
   | markuplint regression | Fixture was `match-error`; ml side no longer reports | Treat as a bug in the responsible rule — find the causing commit, fix or revert. Do not exclude. |

5. Pattern-based exclusions fail in the opposite direction — silently.
   A wording change makes a `patterns[]` entry stop matching without
   any `nu-only` reappearance (the fixture just flips verdict). Check
   the `nu-over` headcount against the expected counts recorded in
   pattern `reason` fields, and re-check any `deferred-*` counts in
   the `bench-triage` "Deferred specs" table.

6. Verify all invariants (table above), then sync issue bodies:

   ```
   yarn bench:xref --audit
   yarn bench:xref --all --write
   ```

7. Commit `snapshots/diff/*`, `snapshots/excluded-ids.json`, the
   submodule pointer, and any `issue-xref.config.ts` edits as a
   `test:` commit describing what moved (submodule range and/or image
   digest). Raw snapshot trees stay gitignored.

Before acting on any single surprising fixture, pin it with
`--concurrency 1` (see the concurrency caveat in `bench-triage`) —
parallel-run flicker is not a signal.

## markuplint-side regression check

After a rule / spec / parser change that could affect bench-covered
behavior (no Docker needed):

```
yarn bench:update:ml
yarn bench:compare
```

- `nu-only.json` must stay empty. A new entry here is always a
  regression caused by the change under test — there is no upstream
  axis involved.
- Diff the `ml-only` path set against the committed snapshot. Growth
  is acceptable only when each added path is explained by the change
  (spot-check per the "ml-only readings" note in `bench-triage`);
  shrinkage means detection was lost somewhere — explain every
  disappeared path before committing.

## Periodic health check (cheap, no Docker)

`yarn bench:xref --audit` runs on relevant PRs and a weekly cron
(`.github/workflows/bench-xref-audit.yml`), so CLOSED-issue mappings
surface on their own. What has no automation is upstream drift: the
engine and corpus only move locally when a maintainer runs the update,
so schedule a full nu update follow-up (steps above) periodically —
before each release at the latest (see the pre-release checklist in
`bench-xref`).
