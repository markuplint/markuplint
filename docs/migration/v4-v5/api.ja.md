# API

`markuplint` は v1 の `exec()` を再エクスポートしなくなりました（v4 は `export * from './v1.js'`）。`MLEngine` を使ってください。

`APIOptions.autoLoad` は削除。ルールは常に読み込みます。

削除: `MLResultInfo_v1`；`@markuplint/ml-core` の `getIndent()`；`@markuplint/types` の `Token.getLine` / `getCol`（`Token.getPosition`）；`@markuplint/parser-utils` の `getLine` / `getCol`（`getPosition`）。

`fix: true` 時は `MLResultInfo.fixSummary` があります。トップレベルの `violations` は第 1 パスです。修正後は `fixSummary.finalPassViolations ?? violations`。カーソル移動は `@markuplint/ml-core` の `computeCursorOffset` と `firstPassEdits`。
