---
id: no-deprecated-attr
description: 非推奨と定義されている属性がある場合に警告します。
---

# `no-deprecated-attr`

**非推奨**と定義されている属性がある場合に警告します。

このルールは[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)の仕様データの`deprecated`フラグを参照します。仕様が非推奨としているもの（[HTML Living Standardが警告つきで適合のままとしている機能](https://momdo.github.io/html/obsolete.html#obsolete-but-conforming-features)、SVG、MathML）と、[@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data)に基づくブラウザーベンダーの非推奨が対象です。HTML Living Standardの機能には、一部の要素でだけ非推奨になるものがあります。`type`が`number`の`<input>`の`maxlength`と`size`、空または JavaScript MIME type essence matchである`<script>`の`type`です。仕様データはこれをセレクター（`deprecatedWhen`）で表し、要素がそれに一致したときに報告します。

HTML Living Standardが非準拠かつ廃止された機能としてマークしている属性は[`no-obsolete-attr`](/docs/rules/no-obsolete-attr)の担当です。

❌ 間違ったコード例

```html
<a name="top">Top</a>
```

✅ 正しいコード例

```html
<a id="top">Top</a>
```
