---
description: Maintenance tasks for markuplint
globs:
  - packages/markuplint/src/**/*.ts
alwaysApply: false
---

# markuplint-maintenance

Perform maintenance tasks for `markuplint`: add CLI options, add reporters,
and modify configuration resolution logic.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                       | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| `add-cli-option`           | Add a new CLI flag and wire it through the command pipeline |
| `add-reporter`             | Add a new output formatter for lint results                 |
| `modify-config-resolution` | Change how MLEngine resolves and merges configuration       |

If omitted, defaults to `add-cli-option`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, MLEngine pipeline, CLI architecture, reporter system
- `src/api/ml-engine.ts` -- MLEngine class (core orchestrator, config resolution, watch mode)
- `src/api/types.ts` -- APIOptions, MLEngineEventMap type definitions
- `src/cli/bootstrap.ts` -- meow CLI flag definitions and help text
- `src/cli/command.ts` -- Lint command implementation
- `src/cli/output.ts` -- Reporter dispatch logic

## Task: add-cli-option

Add a new CLI flag and wire it through the command pipeline. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Define the flag

1. Read `src/cli/bootstrap.ts`
2. Add the new flag to the `meow` flags object with type, default, and optional shortFlag
3. Update the `help` text to document the new flag
4. Note: `CLIOptions` type updates automatically (derived from `typeof cli.flags`)

### Step 2: Wire through command

1. Read `src/cli/command.ts`
2. Extract the flag value from `options` and implement the processing logic
3. If the flag affects the API layer, also update `src/api/types.ts` (`APIOptions`)

### Step 3: Verify

1. Add tests in `src/cli/index.spec.ts`
2. Build: `yarn build --scope markuplint`
3. Test: `yarn test --scope markuplint`

## Task: add-reporter

Add a new output formatter for lint results. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Create the reporter

1. Read existing reporters in `src/reporter/` for the pattern
2. Create a new file `src/reporter/<name>-reporter.ts`
3. Export a function that takes `MLResultInfo` (and optionally `CLIOptions`) and returns `string[]`

### Step 2: Register the reporter

1. Read `src/reporter/index.ts` and add an export for the new reporter
2. Read `src/cli/output.ts` and add a case in the `switch` statement for the new format name

### Step 3: Verify

1. Add tests in `src/reporter/<name>-reporter.spec.ts`
2. Build: `yarn build --scope markuplint`
3. Test: `yarn test --scope markuplint`

## Task: modify-config-resolution

Change how MLEngine resolves and merges configuration. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the current flow

1. Read `src/api/ml-engine.ts` and locate `resolveConfig()`
2. Current priority: options.config -> configFile -> search -> defaultConfig -> recommended
3. Understand `ConfigProvider` methods: `search()`, `set()`, `resolve()` (from `@markuplint/file-resolver`)

### Step 2: Modify the logic

1. Make changes to `resolveConfig()` in `src/api/ml-engine.ts`
2. If changing the API surface, update `src/api/types.ts`

### Step 3: Verify

1. Add tests in `src/api/ml-engine.spec.ts`
2. Build: `yarn build --scope markuplint`
3. Test: `yarn test --scope markuplint`

## Rules

1. **CLI flag types are inferred** -- `CLIOptions` is derived from `typeof cli.flags`; do not manually define flag types.
2. **Reporters return `string[]`** -- each element is one output line; the caller handles joining and writing.
3. **Violations go to stderr, passed results to stdout** -- follow this convention in `output()`.
4. **Test with MLEngine.fromCode()** -- use `MLEngine.fromCode(sourceCode, options)` for API-level tests.
5. **Add JSDoc comments** to all new public types and functions.
