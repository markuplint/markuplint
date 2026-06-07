---
id: script-content
description: '`<script>` 要素の本文を、`type` 属性で示されたコンテンツ仕様に基づき検証します。'
---

# `script-content`

`<script>` 要素の本文を、`type` 属性の値が指すコンテンツ仕様に従って検証します。

現在対応しているコンテンツ形式:

| `type` の値 | 仕様                                                                                                                                   |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `importmap` | [HTML Living Standard § Parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) |

`type` 属性は ASCII 大文字小文字を区別せずに照合します（ユーザーエージェントの MIME タイプ判定に整合）。

## `type="importmap"`

インポートマップに対して以下を違反として報告します。

- 要素本文が空、または空白のみ
- 本文が JSON としてパースできない
- トップレベル値が JSON オブジェクトではない
- トップレベルに `imports` / `scopes` / `integrity` 以外のキーが存在する
- `imports` または `scopes` が JSON オブジェクトではない
- 識別子マップ（`imports` または `scopes` 内の値）に空のキーが存在する
- 識別子マップのアドレス（値側）が文字列ではない
- 識別子マップのアドレスが URL-like 識別子ではない（`/`, `./`, `../` で始まらず、絶対 URL でもない）
- 識別子のキーが `/` で終わっているのに、アドレスが `/` で終わっていない
- `integrity` が JSON オブジェクトではない
- `integrity` のキーが URL-like 識別子ではない
- `integrity` の値が文字列ではない

❌ このルールに適合しない**誤った**コードの例

```html
<script type="importmap"></script>
<script type="importmap">
  {
    "forbidden": {}
  }
</script>
<script type="importmap">
  {
    "imports": {
      "dir/": "/path/to/dir"
    }
  }
</script>
```

✅ このルールに適合する**正しい**コードの例

```html
<script type="importmap">
  {
    "imports": {
      "app": "/path/to/app.js",
      "dir/": "/path/to/dir/"
    },
    "scopes": {
      "/scope/": {
        "x": "./y.js"
      }
    }
  }
</script>
```
