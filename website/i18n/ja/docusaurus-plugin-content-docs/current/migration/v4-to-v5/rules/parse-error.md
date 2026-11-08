---
sidebar_position: 5
title: 'parse-error'
---

# `parse-error`

改名ではありません。v4 の `parse-error` チャネルは致命的 `ParserError` だけです。v5 は非致命の HTML LS パースエラー（parse5 `onParseError`）と、フレームワークのパーサーがコンパイラの受け付けないマークアップに出すエラーも出せます。**既定オフ。**

```json
{
  "severity": {
    "parseError": "error"
  }
}
```

コード単位は `@markuplint/ml-ast` の `MLASTParseErrorCode`。未指定のコードはオフのまま。`severity.parseError` を書かない設定は、非致命イベントについて v4 と同じ沈黙です。

フレームワークのパーサーは、parse5 のものではない独自のコードを出すことがあります。

| コード                        | パーサー                 | 意味                                                                                                                                                                                           |
| ----------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue-ignored-side-effect-tag` | `@markuplint/vue-parser` | template 内の `<style>` または `<script>`。Vue はこれを除去する（"Tags with side effect (`<script>` and `<style>`) are ignored in client component templates."）ため、どのルールも検査しません |

`parserOptions.documentMode` は `'auto'`（既定）、`'document'`、`'fragment'` で document / fragment 判定を上書きします。
