---
description: 明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。
---

# `require-parent-role`

明示的なロールを持つ要素が必須の親コンテキストの外に配置された場合に警告します。

親は、アクセシビリティツリーに沿って探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、内容の先頭にある要素には判断する親がなく、警告しません。宣言的シャドウルート(`<template shadowrootmode>`)の内容の先頭の要素はホストの中に描画されるため、親はホストです。`slot`はアクセシビリティツリーの要素ではありません。`slot`のフォールバックの内容にある要素や、`slot`に割り当てられたライトDOMの子の親は、`slot`の親です。どの`slot`にも割り当てられないライトDOMの子は描画されないため、判断する親がなく、警告しません。フラグメント(JSXの`<>`、Astroの`<Fragment>`)と、フレームワークが描画しない`template`(Vueの`<template v-if>`・`v-else-if`・`v-else`・`v-for`・`v-slot`)もアクセシビリティツリーの要素ではありません。その中にある要素の親は、フラグメントや`template`の親です。Vueが木に残す`template`(ディレクティブのないもの、`v-show`を持つもの)は通常の要素です。割り当てが分からないとき(手動の割り当て、フレームワークのコンポーネントの`slot`)は、親はホストです。aria-owns属性が参照する要素は、DOMの親ではなく、参照する要素の子です。非表示の要素(その要素か祖先に`hidden`、`aria-hidden="true"`、インラインの`display: none`/`visibility: hidden`がある)のaria-owns属性、すべてのユーザーから隠れた要素(`aria-hidden`を除く同じ条件)を参照するaria-owns属性、先のaria-owns属性が挙げた要素を挙げる後のaria-owns属性、循環の一部になる参照は、要素を移しません。

要素自身のロールが描画されるまで分からない場合(`<li role={props.role}>`、`<li role="listitem" {...props}>`)は判定しません。描画されるまでロールが分からない先祖(`<div role={props.role}>`、`<div role="group" {...props}>`、`<div {...props}>`)は、そのロールが必要とする親かもしれず、コンテキストを通過させるだけの先祖(`presentation`、`none`、ARIA 1.3 では `generic`)かもしれません。先祖が必要な親を満たしうる間は、その要素を警告しません。必要な親が連鎖(ARIA 1.3 の `menu > group`)である場合も同じで、不明な先祖が `menu` かもしれません。

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
