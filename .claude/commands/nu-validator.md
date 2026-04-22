---
description: Refresh the nu-validator compatibility benchmark
disable-model-invocation: true
---

Run the snapshot-based benchmark that compares markuplint against
Nu Html Checker, then show the summary.

## Step 1: Ensure the validator submodule is available

If `tests/external/validator/tests/html/` is missing, initialise it:

```
git submodule update --init tests/external/validator
```

To pull upstream changes first:

```
git submodule update --remote tests/external/validator
```

## Step 2: Ensure build is current

Run `yarn build` if not already built in this session.

## Step 3: Refresh snapshots and diffs

```
yarn bench:update
```

This starts the nu-validator Docker container, runs the full test
suite through both tools, writes the raw snapshots (git-ignored) under
`tests/external/snapshots/`, regenerates
`tests/external/spec/nu-validator.spec.ts`, and produces
`tests/external/snapshots/diff/summary.md`.

To skip the Docker leg (markuplint-only refresh):

```
yarn bench:update:ml
```

If the user asks for deterministic output (e.g., to reproduce a
specific `nu-over` case), add `--concurrency 1`. See
`tests/external/CLAUDE.md` for why this matters.

## Step 4: Show the summary

Read and display `tests/external/snapshots/diff/summary.md`.

## Step 5 (optional): Run the generated spec via vitest

```
npx vitest run --config vitest.nu-validator.config.ts
```

For excluded-ID management and deeper workflow, see
[`tests/external/CLAUDE.md`](../../tests/external/CLAUDE.md).
