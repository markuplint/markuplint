# AST

パーサプラグインと、**AST** トークンを読むカスタムルール向けです。DOM 層（`startOffset` / `endOffset` ゲッターなど）は変わっていません。

| 変更 | v4 | v5 |
| --- | --- | --- |
| 開始位置 | `startOffset`, `startLine`, `startCol` | `offset`, `line`, `col` |
| 終了位置 | `endOffset`, `endLine`, `endCol` | `offset` + `raw`、または `@markuplint/parser-utils/location` |
| 自己閉じ | `selfClosingSolidus` | `tagCloseChar` が `/` で始まる |
| 条件 | `conditionalType` | `blockBehavior?.type` |
| パーサ型 | `MLMarkupLanguageParser` / `Parse` | `MLParser` |
| `getNamespace` | `@markuplint/html-parser` | `@markuplint/parser-utils`（第 2 引数は親ノード） |
