---
description: 要素のロールで許可されていないARIAプロパティ/ステート、特定の要素状態で禁止されたARIA属性、または命名禁止（naming prohibition）の対象となるARIA属性が指定された場合に警告します。
---

# `wai-aria-disallowed-props`

[ARIA in HTML](https://w3c.github.io/html-aria/) が定める以下の方法で禁止されているARIAプロパティ/ステートを検出します。

1. **計算されたロールで許可されていない** — 例: `role="heading"` 上の `aria-pressed`
2. **命名禁止（naming prohibition）** — `<cite>`、`<abbr>`、`<figcaption>` のような暗黙ロールを持たない要素では、命名をサポートするロールを明示的に設定しない限り、`aria-label`、`aria-labelledby`、`aria-braillelabel` を使用できません。
3. **要素固有の禁止** — 特定の要素状態ではすべての `aria-*` 属性が禁止されます（例: `<input type="hidden">`）。また、ある属性が指定されているときに別の `aria-*` が禁止される場合もあります（例: `<button popovertarget>` では popover API が状態を自動管理するため `aria-expanded` 禁止）。

このルールは[`wai-aria`](../wai-aria/)ルールファミリーの一部で、きめ細かなseverity制御のために分割されたものです。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<div role="heading" aria-pressed="true"></div>
<cite aria-label="x">y</cite>
<input type="hidden" aria-hidden="true" />
<button popovertarget="p" aria-expanded="false">Toggle</button>
```

✅ 正しいコード例

```html
<div role="button" aria-pressed="true"></div>
<cite role="button" aria-label="x">y</cite>
<input type="hidden" />
<button popovertarget="p">Toggle</button>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
