---
id: require-ancestor
description: 要素に必須の祖先要素が存在しない場合に警告します。
---

# `require-ancestor`

[HTML Living Standard](https://html.spec.whatwg.org/)に基づき、要素がコンテンツモデルで指定された必須の祖先要素(`descendantOf`)なしに出現している場合に警告します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

祖先は、その要素が属するツリーの中で探します。`template`要素の内容は別のドキュメントフラグメントに属し、マークアップからはその内容がどこに挿入されるか分かりません。そのため、探索は`template`要素の内容の外に出ず、探索が内容の先頭で終わった要素は、`template`要素の外に該当する祖先があってもなくても警告しません。宣言的シャドウルート(`<template shadowrootmode>`)の内容もそれ自身のツリーで、その外にある祖先は数えないため、警告します。テンプレートエンジンのディレクティブを持つ`template`要素(Vueの`<template v-if>`)はHTMLの`template`要素ではないため、探索はそれを通り抜けます。ReactとVueでは、ディレクティブのない`template`要素は子要素が文書の中にある通常の要素なので、探索は他の要素と同じようにそれを通ります。

ファイルの中に親ノードを持たない要素は警告しません。パーシャルやコンポーネントの先頭にある要素がこれにあたり、そのファイルがどこに挿入されるかはマークアップからは分かりません。JSXのフラグメント、テンプレート言語のブロック、ディレクティブを持つ`template`要素は親ノードではないため、ファイルの先頭にあるそれらの中の要素も警告しません。要件は、親ノードを持つ要素に対するものです。

> 親ノードとともにarea要素は、map要素の祖先を持たなければならない。

[HTML Living Standard: area要素](https://momdo.github.io/html/image-maps.html#the-area-element)より引用

❌ 間違ったコード例

```html
<div>
  <area href="/path" alt="Link" />
</div>
```

✅ 正しいコード例

```html
<map name="example">
  <area href="/path" alt="Link" />
</map>
```
