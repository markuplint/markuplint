---
description: aria-hiddenで非表示にされたサブツリー内にフォーカス可能なインタラクティブ要素がある場合に警告します。
---

# `wai-aria-interaction-in-hidden`

aria-hiddenで非表示にされたサブツリー内にフォーカス可能なインタラクティブ要素がある場合に警告します。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div aria-hidden="true"><button>click</button></div>
```

✅ 正しいコード例

```html
<div aria-hidden="true"><span>text</span></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
