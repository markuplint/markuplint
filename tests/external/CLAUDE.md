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

### Auditing a claim against the benchmark

Issues, PRs, and spec memos often claim that "markuplint misses X" or
"markuplint over-detects Y". Before acting on such a claim, confirm
the current state against the snapshots. The workflow below is
intentionally generic — plug in whatever path pattern, rule id, or
nu-validator message the claim is about.

#### Step 1: Find fixtures relevant to the claim

`snapshots/diff/coverage.json` contains one entry per fixture with a
`verdict` (`match-error`, `match-clean`, `ml-over`, `nu-over`) and a
`category`. Slice it by path pattern to see what the benchmark already
knows:

```sh
# Paths mentioning "popover" — replace with the claim's pattern
node -e '
const j = require("./tests/external/snapshots/diff/coverage.json");
j.entries
  .filter(e => /popover/i.test(e.path))
  .forEach(e => console.log(e.verdict.padEnd(13), e.path));
'
```

A claim is suspect when:

- Its "missed error" count is bigger than the `nu-over` slice.
- It lists patterns that are all already `match-error` (markuplint
  already catches them, so "missed" is false).
- It conflates an unrelated `ml-over` in the same area with the
  claim's own scope.

#### Step 2: Inspect the nu-validator messages for a `nu-over` fixture

`snapshots/nu-validator/**` is gitignored, so regenerate it first if
you have not already (`yarn bench:update --target nu`). Then read the
raw JSON for one fixture to see every nu message and its `id`:

```sh
node -e '
const p = "tests/external/snapshots/nu-validator/html/elements/meta/duplicate-charset-novalid.json";
const s = require(p);
s.nuValidator.messages.forEach(m =>
  console.log(m.id, m.type, m.message.slice(0, 80))
);'
```

The `id` values (`nv-<hex12>` with optional `-N` suffix) are the
same keys you use in `excluded-ids.json`.

#### Step 3: Inspect the markuplint violations

Same for the markuplint side:

```sh
node -e '
const p = "tests/external/snapshots/markuplint/html/elements/meta/duplicate-charset-novalid.json";
const s = require(p);
s.markuplint.violations.forEach(v =>
  console.log(v.severity, v.ruleId, v.line + ":" + v.col, v.message.slice(0, 80))
);'
```

Seeing zero violations on a `nu-over` fixture confirms the gap the
claim describes. Seeing matching violations on what the claim says
is a `nu-over` refutes the claim.

#### Step 4: Aggregate over a category

Use `snapshots/diff/markuplint-over-detection.json` and
`snapshots/diff/nu-over-detection.json` for rollups. For example, to
see which markuplint rules fire most often on fixtures nu-validator
accepts as valid:

```sh
node -e '
const j = require("./tests/external/snapshots/diff/markuplint-over-detection.json");
const c = {};
for (const e of j.entries) for (const id of e.ruleIds ?? []) c[id] = (c[id] ?? 0) + 1;
Object.entries(c).sort((a,b) => b[1]-a[1]).forEach(([r, n]) => console.log(n, r));
'
```

or, for nu-over by path prefix:

```sh
node -e '
const j = require("./tests/external/snapshots/diff/nu-over-detection.json");
const c = {};
for (const e of j.entries) {
  const prefix = e.path.split("/").slice(0, 3).join("/");
  c[prefix] = (c[prefix] ?? 0) + 1;
}
Object.entries(c).sort((a,b) => b[1]-a[1]).forEach(([p, n]) => console.log(n, p));
'
```

#### Step 5: Pin a result against `--concurrency 1`

Before filing the finding, confirm determinism for the specific
fixtures that mattered. Parallel nu-validator runs have known
flicker (see [Concurrency and determinism](#concurrency-and-determinism)).
A one-shot pin:

```
yarn bench:update --target nu --concurrency 1 --filter '<the/fixtures/you/care/about>'
```

Rerun `yarn bench:compare` afterwards so the diff JSONs reflect the
pinned run, and re-check the slice from Step 1. If the verdict
flipped, the earlier observation was noise, not a real gap.

#### What to do with the audit result

- Claim confirmed ⇒ keep it on the issue; optionally link the
  relevant snapshot paths so later readers can reproduce.
- Claim refuted ⇒ close the issue, or rewrite its body so the surviving
  bullets reference fixtures that really are `nu-over`.
- Scope drift ⇒ split into a narrower issue or follow-ups; include
  any `ml-over` or `nu-over` fixtures the audit turned up that the
  original claim did not mention.

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
