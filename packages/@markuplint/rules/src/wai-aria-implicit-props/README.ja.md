---
description: ネイティブHTML属性と同等のセマンティクスを持つARIAプロパティが指定された場合に警告します。
---

# `wai-aria-implicit-props`

ネイティブHTML属性と同等のセマンティクスを持つARIAプロパティが指定された場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<input type="checkbox" aria-checked="true" checked />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
