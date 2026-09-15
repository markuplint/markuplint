---
id: progress-value-bounds
description: progress要素の属性値について HTML LS 仕様で定められた不等式関係を検証します（value ≤ max、max省略時は value ≤ 1）。
---

# `progress-value-bounds`

[HTML Living Standard §4.10.14 (the progress element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element) が定める不等式を検証します。

- `value ≤ max`（両方指定されているとき）
- `value ≤ 1`（`max` が省略されているとき）

属性値そのものがパースできない場合、`max` が範囲外（`≤ 0`）の場合、および `value` が負値の場合は [`no-invalid-attr-value`](../no-invalid-attr-value/) ルールが扱うため、本ルールは検査をスキップします。

❌ このルールに適合しない**誤った**コードの例

```html
<progress value="10" max="5">10 of 5</progress> <progress value="1.5">150%</progress>
```

✅ このルールに適合する**正しい**コードの例

```html
<progress value="0.5">50%</progress> <progress value="30" max="100">30%</progress>
```
