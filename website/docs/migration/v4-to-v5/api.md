---
sidebar_position: 7
title: API
---

# API Changes

This page covers breaking changes to the Node.js API. If you call Markuplint programmatically or build editor integrations, read on.

## Summary

| Change                                                           | Who is affected                         |
| ---------------------------------------------------------------- | --------------------------------------- |
| `exec()` function removed                                        | Users calling `exec()` directly         |
| `autoLoad` option removed                                        | Users setting `autoLoad` in API options |
| `MLResultInfo_v1` interface removed                              | Users referencing the v1 result type    |
| `getIndent()` removed from `@markuplint/ml-core`                 | Custom rule authors using `getIndent()` |
| `Token.getLine()` / `Token.getCol()` removed                     | Users calling these static methods      |
| `getLine()` / `getCol()` removed from `@markuplint/parser-utils` | Parser plugin developers                |
| New `FixSummary` on result                                       | API consumers using `fix: true`         |
| New `computeCursorOffset()`                                      | Editor integration developers           |

## `exec()` function removed

:::caution Breaking Change
The legacy `exec()` function has been removed. It was deprecated since v1.
:::

Replace `exec()` with `MLEngine`.

**Before (v4):**

```js
import { exec } from 'markuplint';

const results = await exec({
  files: 'index.html',
  config: '.markuplintrc',
});
```

**After (v5):**

```js
import { MLEngine } from 'markuplint';

const file = await MLEngine.toMLFile('index.html');
const engine = new MLEngine(file, {
  configFile: '.markuplintrc',
});
const result = await engine.exec();
```

### Option mapping

Use this table to translate old `exec()` options to `MLEngine`:

| `exec()` option (v4)                  | `MLEngine` equivalent (v5)                           |
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

## `autoLoad` option removed

:::caution Breaking Change
The `autoLoad` option has been removed from `APIOptions`. Rules are now always auto-loaded unconditionally.
:::

If you were explicitly setting `autoLoad: true`, simply remove it:

```ts
// Before (v4)
const engine = new MLEngine(file, {
  autoLoad: true, // no longer needed
});

// After (v5)
const engine = new MLEngine(file, {});
```

## `MLResultInfo_v1` removed

The legacy `MLResultInfo_v1` interface has been removed. Use `MLResultInfo` instead.

## `getIndent()` removed from `@markuplint/ml-core`

The deprecated `getIndent()` function has been removed from the `@markuplint/ml-core` public API.

## `Token.getLine()` / `Token.getCol()` removed

The deprecated static methods `Token.getLine()` and `Token.getCol()` have been removed from `@markuplint/types`. Use `Token.getPosition()` instead:

```ts
// Before (v4)
const line = Token.getLine(value, offset);
const col = Token.getCol(value, offset);

// After (v5)
const { line, column } = Token.getPosition(value, offset);
```

## `getLine()` / `getCol()` removed from `@markuplint/parser-utils`

The deprecated `getLine()` and `getCol()` functions have been removed. Use `getPosition()` instead:

```ts
// Before (v4)
import { getLine, getCol } from '@markuplint/parser-utils';

const line = getLine(rawCode, offset);
const col = getCol(rawCode, offset);

// After (v5)
import { getPosition } from '@markuplint/parser-utils';

const { line, column } = getPosition(rawCode, offset);
```

## New: `FixSummary` on results

When you run with `fix: true`, the result now includes a `fixSummary` field. It tells you what happened during the fix process.

```ts
const result = await engine.exec();
if (result?.fixSummary) {
  console.log(`Passes: ${result.fixSummary.passCount}`);
  console.log(`Applied: ${result.fixSummary.totalApplied}`);
  console.log(`Skipped: ${result.fixSummary.totalSkipped}`);
}
```

| Field                 | Type                                | Description                                                                   |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `passCount`           | `number`                            | Number of fix passes executed                                                 |
| `totalApplied`        | `number`                            | Total fixes applied across all passes                                         |
| `totalSkipped`        | `number`                            | Fixes skipped due to overlapping edits                                        |
| `reachedMaxPasses`    | `boolean`                           | Whether the 10-pass safety cap was hit                                        |
| `firstPassEdits`      | `readonly TextEdit[]`               | Edits from the first pass (original offsets)                                  |
| `finalPassViolations` | `readonly Violation[] \| undefined` | Violations remaining in `fixedCode`. `undefined` when no fixes remain applied |

The top-level `violations` array reflects the **first** pass only. To check what remains after fixing, prefer `fixSummary.finalPassViolations ?? violations`:

```ts
const remaining = result.fixSummary?.finalPassViolations ?? result.violations;
if (remaining.length === 0) {
  // The fixed code is clean
}
```

:::info
This is a new addition, not a breaking change. Existing code is unaffected.
:::

## New: `computeCursorOffset()`

For editor integrations, `@markuplint/ml-core` now exports `computeCursorOffset()`. It remaps a cursor position from the original source to the fixed source.

```ts
import { computeCursorOffset } from '@markuplint/ml-core';

const newOffset = computeCursorOffset(result.fixSummary.firstPassEdits, originalCursorOffset);
```

This uses the first-pass edits (which reference original source offsets) to compute where the cursor belongs in the fixed code.

:::tip
Combine `FixSummary` and `computeCursorOffset()` for a smooth fix-and-navigate experience in your editor plugin.
:::
