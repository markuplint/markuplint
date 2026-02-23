# API Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Node.js API users** who call markuplint programmatically
- **Custom tool authors** who integrate markuplint via its JavaScript API

## Summary of Changes

| Change | Impact |
|--------|--------|
| `exec` function removed (v1 API) | Users calling `exec()` |
| New: `FixSummary` on `MLResultInfo` | API users accessing fix diagnostics |
| New: `computeCursorOffset()` exported from `@markuplint/ml-core` | Editor integration developers |

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

| v1 (`exec`) option | v5 equivalent |
|---------------------|---------------|
| `files` | First argument to `MLEngine.toMLFile()` |
| `sourceCodes` / `names` / `workspace` | `MLEngine.toMLFile({ sourceCode, name, workspace })` |
| `config` (string) | `configFile` option |
| `config` (object) | `config` option |
| `defaultConfig` | `defaultConfig` option |
| `rules` | `rules` option |
| `rulesAutoResolve` | `autoLoad` option |
| `fix` | `fix` option |
| `locale` | `locale` option |

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

| Field | Type | Description |
|-------|------|-------------|
| `passCount` | `number` | Number of fix passes executed |
| `totalApplied` | `number` | Total fixes applied across all passes |
| `totalSkipped` | `number` | Total fixes skipped due to overlap |
| `reachedMaxPasses` | `boolean` | Whether the 10-pass safety cap was reached |
| `firstPassEdits` | `readonly TextEdit[]` | Applied edits from the first pass (original offsets) |

## New: `computeCursorOffset()`

For editor integrations, `@markuplint/ml-core` exports `computeCursorOffset()` to remap a cursor position from the original source to the fixed source:

```typescript
import { computeCursorOffset } from '@markuplint/ml-core';

// After fixing, remap the cursor
const newOffset = computeCursorOffset(
  result.fixSummary.firstPassEdits,
  originalCursorOffset,
);
```

This uses the first-pass edits (which reference original source offsets) to compute where the cursor should be placed in the fixed code.
