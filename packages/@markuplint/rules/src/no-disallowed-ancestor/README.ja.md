---
id: no-disallowed-ancestor
description: 要素が、コンテンツモデルで禁止されている祖先要素の子孫として出現している場合、またはコンテンツモデルが限定する祖先要素以外を祖先に持つ場合に警告します。
---

# `no-disallowed-ancestor`

[HTML Living Standard](https://html.spec.whatwg.org/)に基づき、要素が、コンテンツモデルが明示的に禁止している祖先要素(`forbiddenAncestors`)の子孫として出現している場合、またはコンテンツモデルが限定する祖先要素(`permittedAncestors`)以外を祖先に持つ場合に警告します。設定は[`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src)にあります。

子要素が親要素自体のコンテンツモデルで許可されているかどうかは[`permitted-contents`](/docs/rules/permitted-contents)の担当であり、このルールの対象ではありません — 一部の要素は、直接の親であるかどうかにかかわらず、特定の祖先要素の下のどこにも出現できないという追加の制約を持っています。

`main`要素の祖先は、仕様が挙げる要素に限られます。

> 階層的に正しいmain要素は、祖先要素がhtml、body、div、アクセシブルな名前のないform、および自律カスタム要素に限定されるものである。各main要素は、階層的に正しいmain要素でなければならない。

[HTML Living Standard: main要素](https://momdo.github.io/html/grouping-content.html#the-main-element)より引用

コンポーネントはカスタム要素として扱い、[`pretenders`](/docs/guides/beyond-html#pretenders)が置き換えるコンポーネントは、置き換え先の要素として判定します。`form`のアクセシブルな名前は、推奨のARIAバージョンで計算します。`aria-label`や`title`の動的な値(式やテンプレートタグ)は名前とみなすため、値が実行時に空になりうる場合でも、そのような`form`の中の`main`要素は報告されます。

`template`要素の内容は別のドキュメントフラグメントに属し、その中の要素は祖先を持ちません。そのため、検査は`template`要素を越えません。テンプレートエンジンのディレクティブを持つ`template`要素(Vueの`<template v-if>`)はHTMLの`template`要素ではないため、検査はそれを通り抜けます。

❌ 間違ったコード例

```html
<address>
  <div>
    <address>Nested address</address>
  </div>
</address>
```

```html
<section>
  <main>Main content</main>
</section>
```

```html
<form aria-label="Search">
  <main>Main content</main>
</form>
```

✅ 正しいコード例

```html
<address>Contact information</address>
```

```html
<body>
  <div>
    <main>Main content</main>
  </div>
</body>
```

```html
<x-layout>
  <main>Main content</main>
</x-layout>
```
