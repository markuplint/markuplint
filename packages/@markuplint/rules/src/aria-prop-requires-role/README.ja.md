---
description: 明示的なロールを持たない要素にグローバルでないARIAプロパティが指定された場合に警告します。
---

# `aria-prop-requires-role`

明示的なロールを持たない要素にグローバルでないARIAプロパティが指定された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div aria-pressed="true"></div>
```

✅ 正しいコード例

```html
<div aria-label="text"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
