---
description: ARIA in HTMLの仕様において要素に許可されていないロールが指定された場合に警告します。
---

# `wai-aria-permitted-roles`

ARIA in HTMLの仕様において要素に許可されていないロールが指定された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<select role="textbox"></select>
```

✅ 正しいコード例

```html
<a href="path/to" role="button">text</a>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
