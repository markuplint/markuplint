---
description: 非推奨（廃止予定）のロールが使用された場合に警告します。
---

# `wai-aria-deprecated-role`

非推奨（廃止予定）のロールが使用された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="directory"></div>
```

✅ 正しいコード例

```html
<div role="list"></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
