---
id: script-content
description: '`<script>` 要素の本文を、`type` 属性で示されたコンテンツ仕様に基づき検証します。'
---

# `script-content`

`<script>` 要素の本文を、`type` 属性の値が指すコンテンツ仕様に従って検証します。

現在対応しているコンテンツ形式:

| `type` の値        | 仕様                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `importmap`        | [HTML Living Standard § Parse an import map string](https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string) |
| `speculationrules` | [HTML Living Standard § 7.6 Speculation rules](https://html.spec.whatwg.org/multipage/speculative-loading.html)                        |

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

## `type="speculationrules"`

[Speculation Rules](https://html.spec.whatwg.org/multipage/speculative-loading.html) は HTML Living Standard § 7.6 で定義されています（元は WICG `nav-speculation` ドラフトで、現在は HTML Standard へリダイレクトされます）。インラインの投機ルールに対して以下を違反として報告します。

- 要素本文が空・空白のみ、または JSON としてパースできない
- トップレベル値が JSON オブジェクトではない、または `prefetch` / `prerender` プロパティが存在しない
- トップレベルに `tag` / `prefetch` / `prerender` 以外のキーが存在する
- `prefetch` / `prerender` の値が JSON 配列ではない、またはその中のルールが JSON オブジェクトではない
- ルールに `source` / `urls` / `where` / `relative_to` / `eagerness` / `referrer_policy` / `tag` / `requires` / `expects_no_vary_search` / `target_hint` 以外のキーが存在する
- `source` が文字列ではない、または `list` / `document` 以外の値である
- リストルール（明示または `urls` から推論）に `urls` がない、または `where` が存在する
- ドキュメントルール（明示または `where` から推論）に `where` がない、または `urls` が存在する
- ルールに `source` がなく source を推論できない（`urls` も `where` もない、または両方ある）
- `urls` が JSON 配列ではない・空・非文字列または空文字列の要素を含む
- `eagerness` が文字列ではない、または `immediate` / `eager` / `moderate` / `conservative` 以外の値である
- `where` が JSON オブジェクトではない、または述語（`and` / `or` / `not` / `href_matches` / `selector_matches`）をちょうど 1 つ含まない
- `and` / `or` 述語が JSON 配列ではない、または空である
- `href_matches` / `selector_matches` のパターンが文字列でも文字列配列でもない・空・空文字列の要素を含む

❌ このルールに適合しない**誤った**コードの例

```html
<script type="speculationrules">
  {
    "prefetch": [{ "source": "list" }]
  }
</script>
<script type="speculationrules">
  {
    "prefetch": [{ "source": "document", "where": {} }]
  }
</script>
```

✅ このルールに適合する**正しい**コードの例

```html
<script type="speculationrules">
  {
    "prefetch": [
      {
        "source": "document",
        "where": {
          "and": [{ "href_matches": "/*" }, { "not": { "selector_matches": ".no-prefetch" } }]
        },
        "eagerness": "moderate"
      }
    ],
    "prerender": [{ "source": "list", "urls": ["/next"] }]
  }
</script>
```
