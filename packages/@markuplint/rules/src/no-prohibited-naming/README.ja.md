---
id: no-prohibited-naming
description: 命名禁止(naming-prohibited)要素に aria-label / aria-labelledby / aria-braillelabel が使われている場合に警告します。
---

# `no-prohibited-naming`

[ARIA in HTML](https://w3c.github.io/html-aria/#dfn-naming-prohibited) が命名を禁止している要素 — 暗黙のロールを持たない要素(`<cite>`、`<abbr>`、`<figcaption>` など)や自律型カスタム要素(`<my-widget>` など) — に `aria-label`、`aria-labelledby`、`aria-braillelabel` が使われている場合に警告します。命名をサポートする明示的なロールが設定されている場合を除きます。カスタマイズされた組み込み要素(`<button is="x-y">`)はホスト要素の仕様データを継承し、通常の経路に従います。

旧`wai-aria-disallowed-props`ルールから、[`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop)、[`role-supports-aria-prop`](/docs/rules/role-supports-aria-prop)とともに分割されました。

❌ 間違ったコード例

```html
<cite aria-label="x">y</cite> <my-widget aria-label="x">y</my-widget>
```

✅ 正しいコード例

```html
<cite role="button" aria-label="x">y</cite> <my-widget role="button" aria-label="x">y</my-widget>
```
