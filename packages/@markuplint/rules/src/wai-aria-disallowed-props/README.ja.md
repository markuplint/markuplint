---
description: 要素のロールで許可されていないARIAプロパティ/ステートが指定された場合に警告します。
---

# `wai-aria-disallowed-props`

要素のロールで許可されていないARIAプロパティ/ステートが指定された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="heading" aria-pressed="true"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
