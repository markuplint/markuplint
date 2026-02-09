---
description: Maintenance tasks for @markuplint/ml-config
globs:
  - packages/@markuplint/ml-config/src/**/*.ts
alwaysApply: false
---

# ml-config-maintenance

Perform maintenance tasks for `@markuplint/ml-config`: add config properties,
modify merge strategies, and update rule merge logic.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                  | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `add-config-property` | Add a new property to the Config type and implement its merge strategy |
| `add-merge-strategy`  | Change an existing property's merge strategy                           |
| `modify-rule-merge`   | Modify the rule merge logic in mergeRule()                             |

If omitted, defaults to `add-config-property`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, type system, merge algorithm details, and template rendering
- `src/types.ts` -- All type definitions (source of truth for Config, Rule, Pretender types)
- `src/merge-config.ts` -- Merge algorithm (source of truth for mergeConfig, mergeRule, helpers)
- `src/utils.ts` -- Template rendering and utility functions

## Task: add-config-property

Add a new property to the Config type and implement its merge strategy. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Define the type

1. Read `src/types.ts`
2. Add the readonly property to the `Config` type
3. If the property needs a different type in the optimized form, update `OptimizedConfig` (use `Omit` + re-define)
4. Decide whether to include it in `OverrideConfig` (add to `NoInherit` if it should be top-level only)

### Step 2: Implement the merge strategy

1. Read `src/merge-config.ts`
2. Add the merge logic inside `mergeConfig()`, choosing the appropriate strategy:
   - `mergeObject()` for object deep merge
   - `concatArray()` for array concatenation
   - `b.prop ?? a.prop` for simple right-side precedence
3. If the property needs format conversion (like plugins or pretenders), implement a conversion helper

### Step 3: Verify

1. Add test cases in `src/merge-config.spec.ts`
2. Build: `yarn build --scope @markuplint/ml-config`
3. Test: `yarn test --scope @markuplint/ml-config`

## Task: add-merge-strategy

Change an existing property's merge strategy. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand the current strategy

1. Read `src/merge-config.ts` and locate the property in `mergeConfig()`
2. Read `ARCHITECTURE.md` section "Per-Property Merge Strategy Table" for context

### Step 2: Modify the strategy

1. Replace the current merge call with the new strategy
2. Available strategies: `mergeObject()`, `concatArray()`, `b.prop ?? a.prop`, or a custom helper

### Step 3: Verify

1. Update existing tests or add new ones in `src/merge-config.spec.ts`
2. Build: `yarn build --scope @markuplint/ml-config`
3. Test: `yarn test --scope @markuplint/ml-config`

## Task: modify-rule-merge

Modify the rule merge logic in `mergeRule()`. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the current flow

1. Read `src/merge-config.ts` and locate the `mergeRule()` function
2. Current flow: `false` check -> `undefined` checks -> value type check -> object type merge
3. Read `ARCHITECTURE.md` section "mergeRule()" for the detailed flowchart

### Step 2: Modify the logic

1. Make changes to `mergeRule()`, paying attention to:
   - The `false` absolute disable behavior
   - Array concatenation for value arrays
   - Deep merge for options via `mergeObject()`
   - Right-side precedence for severity, value, reason

### Step 3: Verify

1. Verify existing tests still pass (especially the edge cases in `src/merge-config.spec.ts`)
2. Add new test cases for the modified behavior
3. Build: `yarn build --scope @markuplint/ml-config`
4. Test: `yarn test --scope @markuplint/ml-config`

## Rules

1. **All Config properties are `readonly`** -- use `readonly` for all fields in type definitions.
2. **Choose merge strategies carefully** -- refer to the strategy table in `ARCHITECTURE.md` when deciding how to merge a new property.
3. **Test merge edge cases** -- always test with `undefined`, empty objects, and conflicting values.
4. **Run `deleteUndefProp()` after merge** -- ensure no `undefined` properties leak into the result.
5. **Add JSDoc comments** to all new public types and functions.
