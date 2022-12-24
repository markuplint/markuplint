---
description: 非推奨もしくは廃止または非標準な要素があると警告します。
---

# `deprecated-element`

非推奨（**deprecated**）もしくは廃止（**obsolete**）または非標準（**non-standard**）な要素があると警告します。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/index.json)に設定値を持っています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<font color="red">lorem</font>
```

✅ 正しいコード例

```html
<span class="red">lorem</span>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
