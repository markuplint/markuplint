---
description: 要素の暗黙のロールと同じロールが明示的に指定された場合に警告します。
---

# `no-redundant-role`

要素の暗黙のロールと同じロールが明示的に指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<nav role="navigation"></nav>
```

✅ 正しいコード例

```html
<nav role="menu"></nav>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
