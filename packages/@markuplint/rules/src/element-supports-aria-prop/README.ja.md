---
id: element-supports-aria-prop
description: ARIA in HTML の要素固有の制約により ARIA プロパティ・状態が禁止されている場合に警告します。
---

# `element-supports-aria-prop`

要素の計算されたロールに関わらず、[ARIA in HTML](https://w3c.github.io/html-aria/) が定める要素固有の制約により `aria-*` 属性が禁止されている場合に警告します。

1. **要素固有の禁止** — 一部の要素状態(例: `<input type="hidden">`)ではすべての `aria-*` 属性が禁止され、他の属性が存在する場合や特定の親コンテキストにある場合に個別の属性が禁止されることがあります(例: popover / Invoker Commands API が状態を自動管理するため `<button popovertarget>` や `<button commandfor>` 上の `aria-expanded`、展開状態が `open` 属性にマッピングされるため `<details>` 内の最初の `<summary>` 上の `aria-expanded` と `aria-pressed`)。
2. **要素固有のホワイトリスト** — 一部の要素は少数の `aria-*` 属性のみを受け入れます(例: `<br>` と `<wbr>` は `aria-hidden` のみを受け入れる)。ホワイトリスト外の属性は拒否されます。

旧`wai-aria-disallowed-props`ルールから、[`no-prohibited-naming`](/docs/rules/no-prohibited-naming)、[`role-supports-aria-prop`](/docs/rules/role-supports-aria-prop)とともに分割されました。旧ルールの`disallowSetImplicitProps`オプションはこのチェックを制御していましたが、今後はこのルール自体を無効化することがオプトアウトの方法になります。

❌ 間違ったコード例

```html
<br aria-atomic="true" />
<input type="hidden" aria-hidden="true" />
<button popovertarget="p" aria-expanded="false">Toggle</button>
<button command="toggle-popover" commandfor="p" aria-expanded="false">Toggle</button>
<details>
  <summary aria-expanded="false">Summary</summary>
</details>
```

✅ 正しいコード例

```html
<br aria-hidden="true" />
<input type="hidden" />
<button popovertarget="p">Toggle</button>
<button command="toggle-popover" commandfor="p">Toggle</button>
<details>
  <summary>Summary</summary>
</details>
```
