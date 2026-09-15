---
id: role-supports-aria-prop
description: 要素の計算されたロールで ARIA プロパティ・状態が許可されていない場合に警告します。
---

# `role-supports-aria-prop`

要素の計算されたロールの [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/) ロール定義がサポートする状態・プロパティの集合に、ARIA プロパティ・状態が含まれていない場合に警告します(例: `role="heading"` 上の `aria-pressed`)。

旧`wai-aria-disallowed-props`ルールから、[`no-prohibited-naming`](/docs/rules/no-prohibited-naming)、[`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop)とともに分割されました。

❌ 間違ったコード例

```html
<div role="heading" aria-pressed="true"></div>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
```
