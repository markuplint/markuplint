---
id: no-prohibited-naming
description: 命名禁止(naming-prohibited)要素に aria-label / aria-labelledby / aria-braillelabel が使われている場合に警告します。
---

# `no-prohibited-naming`

[ARIA in HTML](https://www.w3.org/TR/html-aria/#dfn-naming-prohibited) が命名を禁止している要素 — 暗黙のロールを持たない要素(`<cite>`、`<abbr>`、`<figcaption>` など)や自律型カスタム要素(`<my-widget>` など) — に `aria-label`、`aria-labelledby`、`aria-braillelabel` が使われている場合に警告します。命名をサポートする明示的なロールが設定されている場合を除きます。カスタマイズされた組み込み要素(`<button is="x-y">`)はホスト要素の仕様データを継承し、通常の経路に従います。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

旧`wai-aria-disallowed-props`ルールから、[`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop)、[`role-supports-aria-prop`](/docs/rules/role-supports-aria-prop)とともに分割されました。

❌ 間違ったコード例

```html
<cite aria-label="x">y</cite> <my-widget aria-label="x">y</my-widget>
```

✅ 正しいコード例

```html
<cite role="button" aria-label="x">y</cite> <my-widget role="button" aria-label="x">y</my-widget>
```
