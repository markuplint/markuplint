---
id: usemap-references-map
description: '`img` 要素の `usemap` 属性は、実在する `map` 要素への有効なハッシュ名参照でなければならないことを強制します。'
---

# `usemap-references-map`

[HTML Living Standard](https://momdo.github.io/html/image-maps.html#attr-hyperlink-usemap) によれば、`<img>` 要素の `usemap` 属性は「`map` 要素への有効な[ハッシュ名参照](https://momdo.github.io/html/common-microsyntaxes.html#valid-hash-name-reference)でなければならない」とされています。これは `#` に続けて、同じツリー内にある `<map>` 要素の `name` 属性の値と完全に一致する文字列です。

参照は `id` ではなく `name` 属性によって行われるため、`id` 参照のみを追跡する [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) では `usemap` の参照先が存在しない、または誤っているケースを検出できません。本ルールはこのギャップを埋めます。

ページの一部であるファイル(フレームワークのコンポーネント、文書型宣言と`html`要素のないHTMLファイル)は、参照先を持つかもしれない別のファイルと合わせてページになるため検査しません。文書全体(`<!doctype html><html>`、または`parserOptions.documentMode`で`document`と宣言したファイル)は検査します。

❌ このルールに適合しない**誤った**コードの例

```html
<img src="shapes.png" alt="" usemap="#nonexistent" />
```

✅ このルールに適合する**正しい**コードの例

```html
<img src="shapes.png" alt="" usemap="#shapes" />
<map name="shapes">
  <area shape="rect" coords="25,25,125,125" href="red.html" alt="Red box." />
</map>
```
