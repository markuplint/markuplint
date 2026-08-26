---
description: ARIAプロパティ/ステートの値が期待される型に適合しない場合に警告します。
---

# `no-invalid-aria-prop-value`

ARIAプロパティ/ステートの値が期待される型に適合しない場合に警告します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="button" aria-pressed="hoge"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
