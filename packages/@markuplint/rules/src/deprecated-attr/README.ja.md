---
description: 非推奨もしくは廃止の属性があると警告します。
---

# `deprecated-attr`

非推奨（**deprecated**）もしくは廃止（**obsolete**）の属性があると警告します。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<img src="path/to" alt="any picture" align="top" />
```

✅ 正しいコード例

```html
<img src="path/to" alt="any picture" style="vertical-align: center" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
