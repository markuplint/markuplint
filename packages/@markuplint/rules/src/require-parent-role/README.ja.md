---
description: 明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。
---

# `require-parent-role`

明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="option">item</div>
```

✅ 正しいコード例

```html
<div role="listbox"><div role="option">item</div></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
