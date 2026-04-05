---
description: ロールに必須のARIAプロパティが指定されていない場合に警告します。
---

# `wai-aria-required-props`

ロールに必須のARIAプロパティが指定されていない場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="slider"></div>
```

✅ 正しいコード例

```html
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
