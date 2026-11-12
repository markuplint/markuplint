---
description: ロールが必要とする子ロールを含んでいない場合に警告します。
---

# `require-owned-elements`

ロールが必要とする子ロールを含んでいない場合に警告します。

所有要素は、アクセシビリティツリーに沿って探します。`template`要素の内容は書かれた場所では描画されないため、所有要素になりません。宣言的シャドウルート(`<template shadowrootmode>`)のホストは、シャドウルートの要素を所有します。シャドウルートはライトDOMの子の代わりに描画されます。そのシャドウルートの`slot`は、名前(`slot`属性)で割り当てられたライトDOMの子、割り当てがなければ自身の子を描画し、それらは`slot`の位置に書かれたものとして所有されます。どの`slot`にも割り当てられないライトDOMの子は描画されません。割り当てが分からないとき(シャドウルートの外の`slot`、フレームワークのコンポーネントの`slot`、手動の割り当て、ライトDOMの子にテンプレート構文があるとき)は、警告しません。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="list"><div>not a listitem</div></div>
```

✅ 正しいコード例

```html
<div role="list"><div role="listitem">item</div></div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
