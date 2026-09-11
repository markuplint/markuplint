---
id: no-redundant-aria-prop
description: ARIA プロパティが等価なネイティブ HTML 属性と同じ意味を冗長に繰り返している場合に警告します。
---

# `no-redundant-aria-prop`

[ARIA in HTML §6](https://w3c.github.io/html-aria/#docconformance) はネイティブ属性を優先するよう推奨しています。この推奨に反して、ARIA プロパティが等価なネイティブ HTML 属性と同じ値(または属性がない場合の暗黙のデフォルト値)を持っている場合に警告します。

旧`wai-aria-implicit-props`ルールから、[`no-contradictory-aria-prop`](/docs/rules/no-contradictory-aria-prop)とともに分割されました。この冗長側は`should`レベル(`warning`)のままですが、矛盾側は`must`レベル(`error`)です。

❌ 間違ったコード例

```html
<input type="checkbox" checked aria-checked="true" />
```

✅ 正しいコード例

```html
<input type="checkbox" checked />
```
