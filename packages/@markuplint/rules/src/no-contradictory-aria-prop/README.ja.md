---
id: no-contradictory-aria-prop
description: ARIA プロパティの値が等価なネイティブ HTML 属性と矛盾している場合に警告します。
---

# `no-contradictory-aria-prop`

[ARIA in HTML §4](https://www.w3.org/TR/html-aria/#docconformance) に基づき、ネイティブ HTML 属性はその ARIA 等価物より優先されなければなりません。ARIA プロパティの値が、等価なネイティブ HTML 属性の現在の値または暗黙の値と矛盾している場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「Attribute name case」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

旧`wai-aria-implicit-props`ルールから、[`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop)とともに分割されました。この矛盾側は`must`レベル(`error`)ですが、冗長側は`should`レベル(`warning`)のままです。

❌ 間違ったコード例

```html
<input type="checkbox" checked aria-checked="false" />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```
