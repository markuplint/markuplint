---
description: 抽象ロールが使用された場合に警告します。
---

# `no-abstract-role`

抽象ロールが使用された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="roletype"></div>
```

✅ 正しいコード例

```html
<div role="button"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
