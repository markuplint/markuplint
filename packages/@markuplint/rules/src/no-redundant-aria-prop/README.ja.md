---
id: no-redundant-aria-prop
description: ARIA プロパティが等価なネイティブ HTML 属性と同じ意味を冗長に繰り返している場合に警告します。
---

# `no-redundant-aria-prop`

[ARIA in HTML §4](https://www.w3.org/TR/html-aria/#docconformance) はネイティブ属性を優先するよう推奨しています。この推奨に反して、ARIA プロパティが等価なネイティブ HTML 属性と同じ値(または属性がない場合の暗黙のデフォルト値)を持っている場合に警告します。

ARIA 属性の名前は、[`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) が属性名を比較するのと同じ方法(同ルールの「Attribute name case」節を参照)で比較されます。DOM が属性名の大文字・小文字を区別しない場合(HTML 要素など)は `ARIA-LABEL` と `aria-label` は同じ属性として扱われ、区別する場合(JSX の `<svg>` 要素など)は別の属性として扱われます。

旧`wai-aria-implicit-props`ルールから、[`no-contradictory-aria-prop`](/docs/rules/no-contradictory-aria-prop)とともに分割されました。この冗長側は`should`レベル(`warning`)のままですが、矛盾側は`must`レベル(`error`)です。

❌ 間違ったコード例

```html
<input type="checkbox" checked aria-checked="true" />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```
