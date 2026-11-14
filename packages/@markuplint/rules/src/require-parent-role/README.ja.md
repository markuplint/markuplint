---
description: 明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。
---

# `require-parent-role`

明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。

親は、アクセシビリティツリーに沿って探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、内容の先頭にある要素には判断する親がなく、警告しません。宣言的シャドウルート(`<template shadowrootmode>`)の内容の先頭の要素はホストの中に描画されるため、親はホストです。`slot`はアクセシビリティツリーの要素ではありません。`slot`のフォールバックの内容にある要素や、`slot`に割り当てられたライトDOMの子の親は、`slot`の親です。どの`slot`にも割り当てられないライトDOMの子は描画されないため、判断する親がなく、警告しません。割り当てが分からないとき(手動の割り当て、フレームワークのコンポーネントの`slot`)は、親はホストです。aria-owns属性が参照する要素は、DOMの親ではなく、参照する要素の子です。非表示の要素(その要素か祖先に`hidden`、`aria-hidden="true"`、インラインの`display: none`/`visibility: hidden`がある)のaria-owns属性、すべてのユーザーから隠れた要素(`aria-hidden`を除く同じ条件)を参照するaria-owns属性、先のaria-owns属性が挙げた要素を挙げる後のaria-owns属性、循環の一部になる参照は、要素を移しません。

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
