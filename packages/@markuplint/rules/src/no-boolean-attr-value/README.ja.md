---
description: 論理属性に値を指定すると警告します。
---

# `no-boolean-attr-value`

論理属性に値を指定すると警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<input type="text" required="required" />
```

✅ 正しいコード例

```html
<input type="text" required />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
