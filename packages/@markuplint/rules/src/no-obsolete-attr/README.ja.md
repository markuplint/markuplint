---
id: no-obsolete-attr
description: HTML Living Standardが非準拠かつ廃止された機能としてマークしている属性がある場合に警告します。
---

# `no-obsolete-attr`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features)が非準拠かつ廃止された機能としてマークしている属性がある場合に警告します。作者はこれを使用してはいけません。

仕様からまだ削除されておらず、非推奨とマークされているだけの属性は[`no-deprecated-attr`](/docs/rules/no-deprecated-attr)の担当です。

❌ 間違ったコード例

```html
<link rel="alternate" href="/feed" charset="utf-8" />
```

✅ 正しいコード例

```html
<link rel="alternate" href="/feed" />
```
