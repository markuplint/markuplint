---
name: bench-setup
metadata:
  internal: true
description: >
  Set up the nu-validator benchmark environment — initialise the
  validator submodule, ensure Docker is running, populate the
  gitignored raw snapshots via yarn bench:update. Also covers Docker
  / nu-runner troubleshooting. Use when bench commands fail with
  "no snapshots found", "Docker daemon not reachable", port 28888
  conflicts, or healthcheck timeouts; or when refreshing the bench
  after a long break.
  Trigger keywords: bench setup, bench Docker, validator submodule,
  no snapshots found, Docker daemon not reachable, healthcheck times out,
  port 28888, yarn bench:update first time, bench install, fresh clone bench.
---

# nu-validator Bench Setup Skill

Get the bench runnable on this machine, or recover when it isn't.
Once this skill's checks pass, drop into `bench-triage` for actual
coverage work.

## Prerequisites

- Docker Desktop / Engine (macOS / Linux; WSL2 on Windows). The
  bench does not install Docker for you.
- Node 22+ (already required by the monorepo).
- The validator submodule checked out:
  ```
  git submodule update --init tests/external/validator
  ```

## Fresh-clone bootstrap

Raw snapshot trees are gitignored. Populate them once:

```
git submodule update --init tests/external/validator
yarn bench:update
```

This pulls the nu-validator Docker image
(`ghcr.io/validator/validator`), runs both tools across the 5442
fixtures, and writes `snapshots/{nu-validator,markuplint}/**`,
`snapshots/diff/*`, `snapshots/meta.json`, and the generated spec.
Takes ~2 minutes at default concurrency.

## Routine refresh after dev sync

```
git submodule update --remote tests/external/validator
yarn bench:update
```

Review `snapshots/diff/summary.md` and `snapshots/diff/*.json` in
the PR. The raw snapshot trees stay local-only.

## Markuplint rule change (skip the Docker leg)

```
yarn bench:update:ml
```

Only re-runs the markuplint side; reuses existing nu snapshots.

## Commands reference

| Command | What it does |
| --- | --- |
| `yarn bench:update` | Full sweep: Docker → nu + ml snapshots → compare → generate-spec → report. |
| `yarn bench:update:ml` | Same chain, skips Docker / nu. Use after markuplint rule edits. |
| `yarn bench:compare` | Re-run compare against existing snapshots. |
| `yarn bench:generate-spec` | Rewrite `spec/nu-validator.spec.ts` from `coverage.json`. |
| `yarn bench:report` | Rewrite `snapshots/diff/summary.md`. |
| `yarn bench:verify` | `vitest run --config vitest.nu-validator.config.ts`. |

`yarn bench:update` flags:

| Flag | Effect |
| --- | --- |
| `--target nu\|markuplint\|all` | Restrict which snapshot tree is rewritten. |
| `--filter '<glob>'` | Subset of validator/tests paths to visit. |
| `--concurrency <n>` | Default `os.availableParallelism() - 1` (capped at 8 for nu). Use `1` for deterministic nu output. |
| `--image-tag <tag\|digest>` | Override the nu-validator image. |
| `--dry-run` | List files and exit. |
| `--skip-refresh` | Stop after the snapshot phase. |

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| `Docker daemon not reachable` | Start Docker Desktop / the daemon. The bench does not install or start Docker. |
| `docker pull failed` | `docker login ghcr.io` if behind authenticated pulls, otherwise check connectivity. |
| Healthcheck times out | nu-validator takes 10–30 s to come up cold. If > 60 s, `docker logs ml-nu-validator`. |
| `Port 28888 already allocated` | Stop the conflicting container, or edit `DEFAULT_PORT` in `bench/docker.ts`. |
| `yarn bench:verify` / `yarn bench:compare` "no snapshots found" | Raw trees are gitignored on a fresh clone. Run `yarn bench:update`. |
| One or two snapshot files flip between runs | Expected nu parallelism flicker. Rerun with `--concurrency 1` when reproducibility matters. |
| Unexpected diffs after a submodule bump | Check `meta.json` for image-digest / markuplint-version changes. |
