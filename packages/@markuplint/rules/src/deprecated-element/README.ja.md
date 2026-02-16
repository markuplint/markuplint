---
description: 非推奨もしくは廃止な要素があると警告します。
---

# `deprecated-element`

非推奨（**deprecated**）もしくは廃止（**obsolete**）な要素があると警告します。

[HTML Living Standard](https://momdo.github.io/html/)を基準として[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)から最新情報を確認しています。 [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)に設定値を持っています。

> **注意:** 非標準（non-standard）要素の検出は [`no-unsupported-features`](../no-unsupported-features/README.ja.md) ルールの `checkNonStandard` オプションに移管されました。

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
