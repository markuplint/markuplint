---
id: no-obsolete-element
description: HTML Living Standardが非準拠かつ廃止された機能としてマークしている要素がある場合に警告します。
---

# `no-obsolete-element`

[HTML Living Standard](https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features)が非準拠かつ廃止された機能としてマークしている要素がある場合に警告します。作者はこれを使用してはいけません。

仕様からまだ削除されておらず、非推奨とマークされているだけの要素は[`no-deprecated-element`](/docs/rules/no-deprecated-element)の担当です。

❌ 間違ったコード例

```html
<font></font>
<big></big>
<marquee></marquee>
```

✅ 正しいコード例

```html
<span style="font-size: larger"></span>
```
