---
description: aria-hiddenで非表示にされたサブツリー内にフォーカス可能なインタラクティブ要素がある場合に警告します。
---

# `no-focusable-in-aria-hidden`

aria-hiddenで非表示にされたサブツリー内にフォーカス可能なインタラクティブ要素がある場合に警告します。

先祖の`aria-hidden`は、アクセシビリティツリーに沿って探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、`template`要素の外にある`aria-hidden`は、その内容の要素には数えません。宣言的シャドウルート(`<template shadowrootmode>`)の内容はホストの中に描画されるため、ホストとその先祖の`aria-hidden`を数えます。

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
