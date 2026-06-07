# API Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Node.js API users** who call markuplint programmatically
- **Custom tool authors** who integrate markuplint via its JavaScript API

## Summary of Changes

| Change                                                                | Impact                                  |
| --------------------------------------------------------------------- | --------------------------------------- |
| `exec` function removed (v1 API)                                      | Users calling `exec()`                  |
| `autoLoad` option removed                                             | Users setting `autoLoad` in API options |
| `MLResultInfo_v1` interface removed                                   | Users referencing the v1 result type    |
| `getIndent()` removed from `@markuplint/ml-core`                      | Custom rule authors using `getIndent()` |
| `Token.getLine()` / `Token.getCol()` removed from `@markuplint/types` | Users calling these static methods      |
| `getLine()` / `getCol()` removed from `@markuplint/parser-utils`      | Parser plugin developers                |
| New: `FixSummary` on `MLResultInfo`                                   | API users accessing fix diagnostics     |
| New: `computeCursorOffset()` exported from `@markuplint/ml-core`      | Editor integration developers           |

## `exec` Function Removed

The legacy `exec` function (v1 API) has been removed. Use `lint` or `MLEngine` instead.

### v4

```js
import { exec } from 'markuplint';

const results = await exec({
  files: 'index.html',
  config: '.markuplintrc',
});
```

### v5

Using `MLEngine`:

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, {
  configFile: '.markuplintrc',
});
const result = await engine.exec();
```

### Migration

| v1 (`exec`) option                    | v5 equivalent                                        |
| ------------------------------------- | ---------------------------------------------------- |
| `files`                               | First argument to `MLEngine.toMLFile()`              |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config` (string)                     | `configFile` option                                  |
| `config` (object)                     | `config` option                                      |
| `defaultConfig`                       | `defaultConfig` option                               |
| `rules`                               | `rules` option                                       |
| `rulesAutoResolve`                    | Removed — rules are now always auto-loaded           |
| `fix`                                 | `fix` option                                         |
| `locale`                              | `locale` option                                      |

## `autoLoad` Option Removed

The `autoLoad` option has been removed from `APIOptions`. Rules referenced in your ruleset are now always auto-loaded unconditionally. If you were explicitly setting `autoLoad: true`, simply remove it — the behavior is now the default.

```ts
// v4
const engine = new MLEngine(file, {
  autoLoad: true, // no longer needed
});

// v5
const engine = new MLEngine(file, {});
```

## `MLResultInfo_v1` Removed

The legacy `MLResultInfo_v1` interface has been removed. Use `MLResultInfo` instead.

## `getIndent()` Removed from `@markuplint/ml-core`

The deprecated `getIndent()` function has been removed from the `@markuplint/ml-core` public API.

## `Token.getLine()` / `Token.getCol()` Removed

The deprecated static methods `Token.getLine()` and `Token.getCol()` have been removed from `@markuplint/types`. Use `Token.getPosition()` instead:

```ts
// v4
const line = Token.getLine(value, offset);
const col = Token.getCol(value, offset);

// v5
const { line, column } = Token.getPosition(value, offset);
```

## `getLine()` / `getCol()` Removed from `@markuplint/parser-utils`

The deprecated `getLine()` and `getCol()` functions have been removed. Use `getPosition()` instead:

```ts
// v4
import { getLine, getCol } from '@markuplint/parser-utils';

const line = getLine(rawCode, offset);
const col = getCol(rawCode, offset);

// v5
import { getPosition } from '@markuplint/parser-utils';

const { line, column } = getPosition(rawCode, offset);
```

## New: `FixSummary` on `MLResultInfo`

When `fix: true` is set, `MLResultInfo` now includes a `fixSummary` field with diagnostics about the fix process:

```typescript
const result = await engine.exec();
if (result?.fixSummary) {
  console.log(`Passes: ${result.fixSummary.passCount}`);
  console.log(`Applied: ${result.fixSummary.totalApplied}`);
  console.log(`Skipped: ${result.fixSummary.totalSkipped}`);
}
```

`FixSummary` fields:

| Field                 | Type                                | Description                                                                                                                                                          |
| --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `passCount`           | `number`                            | Number of fix passes executed                                                                                                                                        |
| `totalApplied`        | `number`                            | Total fixes applied across all passes                                                                                                                                |
| `totalSkipped`        | `number`                            | Total fixes skipped due to overlap                                                                                                                                   |
| `reachedMaxPasses`    | `boolean`                           | Whether the 10-pass safety cap was reached                                                                                                                           |
| `firstPassEdits`      | `readonly TextEdit[]`               | Applied edits from the first pass (original offsets)                                                                                                                 |
| `finalPassViolations` | `readonly Violation[] \| undefined` | Violations remaining in `fixedCode`, re-verified after the last pass. `undefined` when no fixes remain applied (the first-pass `violations` are then accurate as-is) |

Note that the top-level `violations` array reflects the **first** pass only. To check what remains after fixing, use `fixSummary.finalPassViolations ?? violations`:

```typescript
const remaining = result.fixSummary?.finalPassViolations ?? result.violations;
if (remaining.length === 0) {
  // The fixed code is clean
}
```

## New: `computeCursorOffset()`

For editor integrations, `@markuplint/ml-core` exports `computeCursorOffset()` to remap a cursor position from the original source to the fixed source:

```typescript
import { computeCursorOffset } from '@markuplint/ml-core';

// After fixing, remap the cursor
const newOffset = computeCursorOffset(result.fixSummary.firstPassEdits, originalCursorOffset);
```

This uses the first-pass edits (which reference original source offsets) to compute where the cursor should be placed in the fixed code.
