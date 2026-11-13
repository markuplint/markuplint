---
description: 属性がひとつの要素の中で重複していたら警告します。名前はDOMまたはフレームワークが比較するとおりに比較します。
---

# `no-duplicate-attr`

**属性**がひとつの要素の中で重複していたら警告します。名前はDOMまたはフレームワークが比較するとおりに比較します。

名前はDOMが比較するとおりに比較します。HTML要素とカスタム要素の属性名はASCIIの大文字小文字を区別せずに、JSXなどフレームワークがDOM APIで設定するSVG・MathML要素の属性名とコンポーネントのpropsは書かれたとおりに比較します（`<Foo fooBar foobar />`は重複ではありません）。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

> 名前が互いにASCII大文字・小文字不区別で一致する同じ開始タグで2つ以上の属性があってはならない。

[HTML Living Standard 13.1.2.3 属性](https://momdo.github.io/html/syntax.html#attributes-2:~:text=%E5%90%8D%E5%89%8D%E3%81%8C%E4%BA%92%E3%81%84%E3%81%ABASCII%E5%A4%A7%E6%96%87%E5%AD%97%E3%83%BB%E5%B0%8F%E6%96%87%E5%AD%97%E4%B8%8D%E5%8C%BA%E5%88%A5%E3%81%A7%E4%B8%80%E8%87%B4%E3%81%99%E3%82%8B%E5%90%8C%E3%81%98%E9%96%8B%E5%A7%8B%E3%82%BF%E3%82%B0%E3%81%A72%E3%81%A4%E4%BB%A5%E4%B8%8A%E3%81%AE%E5%B1%9E%E6%80%A7%E3%81%8C%E3%81%82%E3%81%A3%E3%81%A6%E3%81%AF%E3%81%AA%E3%82%89%E3%81%AA%E3%81%84%E3%80%82)より引用

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

フレームワークのディレクティブはDOMの属性ではないので、フレームワークが重複とみなす名前で比較します。

- VueとSvelteは、修飾子を含めて書かれたとおりの名前で比較します。`@keydown.enter`と`@keydown.space`、`@keydown`と`@KEYDOWN`、`@click`と`v-on:click`は重複ではなく、`@keydown.enter`を2つ、または`:class`を2つ書くと重複です。`:class`と`class`もVueが統合するので重複ではありません。
- Vueは、同じキーとして扱う`v-bind`も重複とします。Vueは最初の1つを残し、残りをエラーなしで捨てるためです。`:id.prop`と`.id`、`:id.attr`と`v-bind:id.attr`、`:view-box.camel`と`:viewBox`、`:id.foo`と`:id`（Vueが知らない修飾子は無視されます）が該当します。
- Svelteは、同じ`on:`、`use:`、`bind:this`をいくつでも認めます。
- AlpineとhtmxはブラウザのHTMLパーサーが作る属性を読むので、大文字小文字を区別せず、綴りが違う名前（`@click`と`x-on:click`、`hx-on:click`と`hx-on-click`）は別の属性です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div data-attr="value" data-Attr="db"></div>
```

```vue
<template>
  <button @keydown.enter.stop="a" @keydown.enter.stop="b"></button>
</template>
```

✅ 正しいコード例

```html
<div data-attr="value" data-Attr2="db"></div>
```

```vue
<template>
  <button @keydown.enter="a" @keydown.space="b"></button>
</template>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
