---
description: 要素にアクセシブルな名前がなければ警告します。
---

# `require-accessible-name`

要素にアクセシブルな名前がなければ警告します。名前が必要かどうかはARIAロールによって異なります。

要素が非表示かどうかはアクセシビリティツリーに沿って判断し、コントロールを囲む`label`はコントロールが属するツリーの中で探します。`template`要素の内容は書かれた場所では描画されず、マークアップからはどこに挿入されるか分かりません。そのため、`template`要素の外にある`aria-hidden`や`hidden`はその内容の要素を非表示にせず、外にある`label`はその内容のコントロールに名前を与えません。その内容は祖先のアクセシブルネームにもなりません。宣言的シャドウルートは、ホストがそれを持てて `shadowrootmode` が `open` か `closed` のときにホストへ付きます。付いたときは、ホストを非表示にするものは内容の要素も非表示にし、ホストが内容から名前を取るときはその内容がホストの名前になります。`button` の中のように付かない `template` は何も寄与しません。付くかどうかマークアップから分からないときは、祖先を報告しません。そのシャドウルートの`slot`は、名前(`slot`属性)で割り当てられたライトDOMの子、割り当てがなければ自身の子を名前に寄与します。どの`slot`にも割り当てられないライトDOMの子は名前になりません。割り当てが分からないとき(シャドウルートの外の`slot`、フレームワークのコンポーネントの`slot`、手動の割り当て、ライトDOMの子にテンプレート構文があるとき)は、報告しません。

条件ブロック(Svelteの`{#if}`、Alpine.jsの`<template x-if>`、Vueの`v-if`・`v-else-if`・`v-else`・`v-for`をもつ要素)のどの分岐が描画されるかはマークアップから分からないため、いずれかの分岐にある名前は名前として扱い、その名前を分岐にもつ要素は報告しません。分岐の中にあるコンポーネントや式のような不明な内容は、ブロックの外にある場合と同じく不明として扱います。どの分岐も名前を与えないときは報告します。

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
