---
id: no-contradictory-aria-prop
description: ARIA プロパティの値が等価なネイティブ HTML 属性と矛盾している場合に警告します。
---

# `no-contradictory-aria-prop`

[ARIA in HTML §6](https://w3c.github.io/html-aria/#docconformance) に基づき、ネイティブ HTML 属性はその ARIA 等価物より優先されなければなりません。ARIA プロパティの値が、等価なネイティブ HTML 属性の現在の値または暗黙の値と矛盾している場合に警告します。

旧`wai-aria-implicit-props`ルールから、[`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop)とともに分割されました。この矛盾側は`must`レベル(`error`)ですが、冗長側は`should`レベル(`warning`)のままです。

❌ 間違ったコード例

```html
<input type="checkbox" checked aria-checked="false" />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```
