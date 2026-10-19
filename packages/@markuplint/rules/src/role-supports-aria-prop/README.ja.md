---
id: role-supports-aria-prop
description: 要素の計算されたロールで ARIA プロパティ・状態が許可されていない場合に警告します。
---

# `role-supports-aria-prop`

要素の計算されたロールの [WAI-ARIA](https://w3c.github.io/aria/) ロール定義がサポートする状態・プロパティの集合に、ARIA プロパティ・状態が含まれていない場合に警告します(例: `role="heading"` 上の `aria-pressed`)。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「属性名の大文字・小文字」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

旧`wai-aria-disallowed-props`ルールから、[`no-prohibited-naming`](/docs/rules/no-prohibited-naming)、[`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop)とともに分割されました。

❌ 間違ったコード例

```html
<div role="heading" aria-pressed="true"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```
