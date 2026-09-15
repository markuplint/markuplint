---
description: childrenPresentationalを持つロールの子孫要素にARIA属性が指定された場合に警告します。
---

# `no-aria-on-presentational-children`

childrenPresentationalを持つロールの子孫要素にARIA属性が指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="img"><span aria-label="text"></span></div>
```

✅ 正しいコード例

```html
<div role="img"><span>text</span></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
