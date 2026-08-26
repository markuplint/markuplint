---
description: ロールにおいて非推奨のARIAプロパティ/ステートが使用された場合に警告します。
---

# `no-deprecated-aria-prop`

ロールにおいて非推奨のARIAプロパティ/ステートが使用された場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="img" aria-disabled="true"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
