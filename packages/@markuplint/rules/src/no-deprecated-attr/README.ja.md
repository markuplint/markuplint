---
id: no-deprecated-attr
description: 非推奨と定義されている属性がある場合に警告します。
---

# `no-deprecated-attr`

**非推奨**と定義されている属性がある場合に警告します。

このルールは[MDN Web docs](https://developer.mozilla.org/ja/docs/Web/HTML)が示す[HTML Living Standard](https://html.spec.whatwg.org/)ベースの情報を参照します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

HTML Living Standardが非準拠かつ廃止された機能としてマークしている属性は[`no-obsolete-attr`](/docs/rules/no-obsolete-attr)の担当です。

❌ 間違ったコード例

```html
<img src="path/to" alt="any picture" align="top" />
```

✅ 正しいコード例

```html
<img src="path/to" alt="any picture" style="vertical-align: center" />
```
