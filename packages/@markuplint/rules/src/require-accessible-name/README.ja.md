---
description: 要素にアクセシブルな名前がなければ警告します。
---

# `require-accessible-name`

要素にアクセシブルな名前がなければ警告します。名前が必要かどうかはARIAロールによって異なります。

要素が非表示かどうかはアクセシビリティツリーに沿って判断し、コントロールを囲む`label`はコントロールが属するツリーの中で探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、`template`要素の外にある`aria-hidden`や`hidden`はその内容の要素を非表示にせず、外にある`label`はその内容のコントロールに名前を与えません。宣言的シャドウルート(`<template shadowrootmode>`)の内容はホストの中に描画されるため、ホストを非表示にするものは内容の要素も非表示にします。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

✅ 正しいコード例

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
