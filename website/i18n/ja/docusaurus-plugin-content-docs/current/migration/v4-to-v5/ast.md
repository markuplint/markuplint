---
sidebar_position: 8
title: 'AST'
---

# AST

パーサプラグインと、**AST** トークンを読むカスタムルール向けです。DOM 層（`startOffset` / `endOffset` ゲッターなど）は変わっていません。

| 変更                       | v4                                            | v5                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 開始位置                   | `startOffset`, `startLine`, `startCol`        | `offset`, `line`, `col`                                                                                                                                                                 |
| 終了位置                   | `endOffset`, `endLine`, `endCol`              | `offset` + `raw`、または `@markuplint/parser-utils/location`                                                                                                                            |
| 自己閉じ                   | `selfClosingSolidus`                          | `tagCloseChar` が `/` で始まる                                                                                                                                                          |
| 条件                       | `conditionalType`                             | `blockBehavior?.type`                                                                                                                                                                   |
| パーサ型                   | `MLMarkupLanguageParser` / `Parse`            | `MLParser`                                                                                                                                                                              |
| `getNamespace`             | `@markuplint/html-parser`                     | `@markuplint/parser-utils`（第 2 引数は親ノード）                                                                                                                                       |
| 親／対応ノード参照         | `parentNode` / `pairNode`（オブジェクト参照） | `parentNodeUuid` / `pairNodeUuid`（文字列）。`MLASTDocument.nodeList` と照合して解決                                                                                                    |
| 引用符なし属性値の終端文字 | `/` も終端文字だった                          | 空白と `>` のみが終端。`/` は値の一部として残る（[HTML LS — attribute value (unquoted) state](<https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state>)） |

`endOfUnquotedValueChars`（parser-utils の `attrTokenizer()` / `visitAttr()`）の既定値から `/` が外れました。既定値に依存する同梱パーサー — `html-parser`、`vue-parser`、`ejs-parser`、`astro-parser`、`mdx-parser`、`jsx-parser`、`svelte-parser` — では、引用符なし属性値中の `/` が値の途中で区切られず、値の一部として保持されるようになります（例: `<img src=path/to/file.png>` の値は最初の `/` で打ち切られなくなりました）。`pug-parser` は独自に `endOfUnquotedValueChars: []` を渡しており影響を受けません。`attrTokenizer()` / `visitAttr()` を直接呼び出し、`/` が値を終端することに依存していたカスタムパーサーやルールは、`endOfUnquotedValueChars` を明示的に渡す必要があります。
