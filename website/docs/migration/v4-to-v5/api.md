---
sidebar_position: 7
title: API
---

# API Changes

This page covers breaking changes to the Node.js API. If you call Markuplint programmatically or build editor integrations, read on.

## Summary

| Change                      | Who is affected                 |
| --------------------------- | ------------------------------- |
| `exec()` function removed   | Users calling `exec()` directly |
| New `FixSummary` on result  | API consumers using `fix: true` |
| New `computeCursorOffset()` | Editor integration developers   |

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
| `rulesAutoResolve`                    | `autoLoad` option                                    |
| `fix`                                 | `fix` option                                         |
| `locale`                              | `locale` option                                      |

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

| Field              | Type                  | Description                                  |
| ------------------ | --------------------- | -------------------------------------------- |
| `passCount`        | `number`              | Number of fix passes executed                |
| `totalApplied`     | `number`              | Total fixes applied across all passes        |
| `totalSkipped`     | `number`              | Fixes skipped due to overlapping edits       |
| `reachedMaxPasses` | `boolean`             | Whether the 10-pass safety cap was hit       |
| `firstPassEdits`   | `readonly TextEdit[]` | Edits from the first pass (original offsets) |

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
