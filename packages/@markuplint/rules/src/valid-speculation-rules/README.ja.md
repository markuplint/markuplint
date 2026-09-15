---
id: valid-speculation-rules
description: '`<script type="speculationrules">` 要素の本文を、Speculation Rules の仕様に基づき検証します。'
---

# `valid-speculation-rules`

`<script type="speculationrules">` 要素の本文を、[HTML Living Standard § 7.6 Speculation rules](https://html.spec.whatwg.org/multipage/speculative-loading.html) に従って検証します（元は WICG `nav-speculation` ドラフトで、現在は HTML Standard へリダイレクトされます）。`type` 属性は ASCII 大文字小文字を区別せずに照合します（ユーザーエージェントの MIME タイプ判定に整合）。

旧`script-content`ルールから、`type="importmap"`を担う[`valid-importmap`](/docs/rules/valid-importmap)とともに分割されました。

インラインの投機ルールに対して以下を違反として報告します。

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
