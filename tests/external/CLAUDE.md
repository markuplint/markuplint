# tests/external — nu-validator Compatibility Benchmark

A local, on-demand tool for comparing markuplint against
[Nu Html Checker](https://validator.github.io/validator/) (nu-validator).

**Not wired into CI.** Maintainers run it when they want a fresh
snapshot of the coverage gap between the two tools.

## What the benchmark produces

Running the pipeline gives four derived artefacts under
`tests/external/snapshots/`:

- `coverage.json` — per-file verdict (`match-error`, `match-clean`,
  `ml-over`, `nu-over`) against the `validator/validator` test suite.
- `markuplint-over-detection.json` — files where markuplint flags an
  error that nu-validator doesn't.
- `nu-over-detection.json` — files where nu-validator flags an error
  that markuplint doesn't (candidates for `excluded-ids.json`).
- `summary.md` — human-readable totals and per-category match rates.

The inputs to the comparison are two raw snapshot trees
(`snapshots/nu-validator/**/*.json`, `snapshots/markuplint/**/*.json`)
mirrored 1:1 from `validator/validator/tests/**/*.html`. **Those raw
trees are git-ignored** — regenerate them locally with
`yarn bench:update`. What git tracks is the small derivative set above
plus `meta.json`, `excluded-ids.json`, and the generated spec file.

### Why raw snapshots are not in git

- Committing ~11 000 JSON files (~44 MB) bloats clones, `git log`, and
  `git blame`.
- A full refresh takes ≈ 2 min (5 442 files), so regenerating is
  cheap.
- nu-validator has a non-determinism (see
  [Concurrency and determinism](#concurrency-and-determinism)) that
  produces 1-byte snapshot noise on every parallel run. Tracking that
  in git is pure noise.

The first time you touch the benchmark on a fresh clone, run
`yarn bench:update` (or `yarn bench:update:ml` if the nu tree is still
current) to populate the raw snapshots; otherwise `yarn bench:verify`
and `yarn bench:compare` have nothing to read.

## Prerequisites

- Docker Desktop or Docker Engine (macOS / Linux; WSL2 on Windows).
- Node 22+ (already required by the monorepo).
- Validator submodule checked out:
  ```
  git submodule update --init tests/external/validator
  ```

## Commands

| Command                    | What it does                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `yarn bench:update`        | Full sweep: Docker → nu + ml snapshots → compare → generate-spec → report   |
| `yarn bench:update:ml`     | Same chain but skips the Docker/nu step; useful after markuplint rule edits |
| `yarn bench:compare`       | Re-run compare against existing snapshots (no runner, no Docker)            |
| `yarn bench:generate-spec` | Rewrite `spec/nu-validator.spec.ts` from `coverage.json`                    |
| `yarn bench:report`        | Rewrite `snapshots/diff/summary.md`                                         |
| `yarn bench:verify`        | `vitest run --config vitest.nu-validator.config.ts`                         |

Pass extra flags through to `yarn bench:update`:

| Flag                     | Effect                                          |
| ------------------------ | ----------------------------------------------- |
| `--target nu\|markuplint\|all` | Restrict which snapshot tree is rewritten |
| `--filter '<glob>'`      | Subset of validator/tests paths to visit        |
| `--concurrency <n>`      | HTTP / mlTest parallelism (default: CPU - 1, capped at 8 for nu; use `1` for deterministic nu output — see [Concurrency and determinism](#concurrency-and-determinism)) |
| `--image-tag <tag\|digest>` | Override the nu-validator image                 |
| `--dry-run`              | List files and exit without writing             |
| `--skip-refresh`         | Stop after the snapshot phase (no compare/spec/report) |

### Concurrency and determinism

`--concurrency` controls two things at once: how many HTTP calls to
nu-validator are in flight, and how many `mlTest` runs happen in
parallel. Default is `os.availableParallelism() - 1`, capped at 8 for
the nu runner (to stay kind to the JVM container) and at the full CPU
count for markuplint.

markuplint is deterministic for any concurrency. **nu-validator is
not.** Observed behaviour on `html-aria/misc/aria-owns-broken-idref-
novalid.html` when asked under parallel load:

| Mode                | Messages emitted                |
| ------------------- | ------------------------------- |
| `--concurrency 1`   | `1, 1, 1, 1, 1, 1, 1, 1, 1, 1`  |
| `--concurrency 8`   | `2, 2, 2, 1, 1, 2, 1, 2, 1, 2`  |

The extra message is a spurious "role=option must be contained in
listbox" produced when nu-validator's aria-owns resolution races
against itself across requests. This is a bug in the
`VerifierServlet` sharing state across concurrent requests, not in
our runner.

What this means in practice:

- **Default (`--concurrency 8`)** finishes in ~2 min on a 5 442-file
  suite. Use this for routine checks, including the summary numbers
  that you commit via `diff/*.json`. The file-level verdict counts
  (match-error / match-clean / ml-over / nu-over) stay stable even
  when individual messages flicker — the drift is small and cancels
  out in aggregate.
- **`--concurrency 1`** takes ~10–15 min and is fully deterministic.
  Reach for it when investigating a specific nu-over entry (so you
  know the error actually reproduces), when bisecting a snapshot
  diff, or when filing an upstream nu-validator report.

`--concurrency` is purely a speed/determinism knob; the committed
derivatives are stable enough for PR review regardless.

## Workflow

### First time on a fresh clone

Raw snapshot trees are git-ignored, so you need to build them once:

```
git submodule update --init tests/external/validator
yarn bench:update
```

That also (re)produces `snapshots/diff/*`, `snapshots/meta.json`, and
the generated spec file. Commit anything that legitimately changed in
the derivative set.

### Routine refresh

```
git submodule update --remote tests/external/validator
yarn bench:update
```

Review `snapshots/diff/summary.md` and `snapshots/diff/coverage.json`
in the PR. Raw `snapshots/{nu-validator,markuplint}/**` are local-only
and intentionally absent from git; the derivative diff is the source
of review.

### Markuplint rule change

Skip the expensive nu leg — only the markuplint snapshot tree moves:

```
yarn bench:update:ml
```

Still regenerates the diff, spec, and report. Raw markuplint
snapshots live only on your disk; commit the `diff/*.json` / spec
changes that fall out of the rerun.

### Reproducing a specific nu-over entry

Because parallel nu-validator runs flicker on some aria-owns fixtures
(see [Concurrency and determinism](#concurrency-and-determinism)),
reproduce a specific flagged message with:

```
yarn bench:update --target nu --concurrency 1 --filter 'html-aria/**/<file>.html'
```

That leg finishes in seconds for a narrow filter and gives you a
stable baseline before opening an upstream nu-validator issue.

### Declaring a nu-validator over-detection

Nu-validator and markuplint legitimately disagree on some corners of
the ARIA / HTML spec. When markuplint is correctly _not_ flagging an
error that nu-validator reports, record it in
`snapshots/excluded-ids.json`:

```jsonc
{
  "entries": [
    {
      "id": "nv-7f3c9a2b0e5d",
      "path": "html-aria/.../example-novalid.html",
      "nuMessage": "Attribute aria-expanded not allowed on element ...",
      "reason": "ARIA 1.2 permits aria-expanded on this role; nu-validator's schema is stale.",
      "addedAt": "2026-04-23",
      "addedBy": "<github-handle>"
    }
  ]
}
```

The ID comes from the corresponding message in
`snapshots/nu-validator/<path>.json`. After editing:

```
yarn bench:compare
yarn bench:generate-spec
yarn bench:report
```

The entry no longer counts as `nu-over` and the verdict collapses to
`match-clean` (or `ml-over` if other active messages remain).

## Architecture

Data flow:

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
                      coverage.json         markuplint-over-detection.json    nu-over-detection.json
                              │                                                           │
                              │                                                           ▼
                              └──► generate-spec.ts ──► spec/nu-validator.spec.ts    report.ts ──► summary.md
```

### Stable message IDs

Every nu-validator message gets an ID of the form `nv-<hex12>`
(collision-disambiguated to `nv-<hex12>-1`, `-2`, etc.) hashed from
`path + type + message + firstLine + firstColumn`. Nu-validator
changing its wording _will_ shift IDs — which is intentional: entries
in `excluded-ids.json` automatically fall out of scope and come back
for review on the next run.

### Reproducibility

`snapshots/meta.json` records the submodule SHA, nu-validator image
digest, markuplint version, and Node version at the time snapshots
were generated. Diffs that look unexpected usually trace back to a
bump in one of those.

## Troubleshooting

- **`Docker daemon not reachable`** — start Docker Desktop / the
  daemon and retry. The bench does not install Docker for you.
- **`docker pull failed`** — `docker login ghcr.io` if behind
  authenticated pulls; otherwise check connectivity.
- **Healthcheck times out** — nu-validator takes 10–30s to come up on
  cold start; if it exceeds 60s, run `docker logs ml-nu-validator` to
  inspect.
- **Port 28888 already allocated** — another container is bound to
  it. Stop the other container, or edit `DEFAULT_PORT` in
  `bench/docker.ts`.
- **`yarn bench:verify` / `yarn bench:compare` errors with "no
  snapshots found"** — raw snapshot trees are git-ignored, so a fresh
  clone has nothing to read. Run `yarn bench:update` first.
- **One or two snapshot files flip between runs** — expected under
  parallel nu-validator load (see [Concurrency and
  determinism](#concurrency-and-determinism)). Rerun with
  `--concurrency 1` when you need stability.
- **Unexpected snapshot diffs after submodule bump** — check
  `meta.json` for image digest / markuplint version changes; they're
  the usual culprits.
