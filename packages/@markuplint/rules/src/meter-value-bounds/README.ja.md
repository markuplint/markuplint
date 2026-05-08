---
id: meter-value-bounds
description: meter要素の属性 (min, max, value, low, high, optimum) 間の HTML LS 仕様で定められた不等式関係を検証します。
---

# `meter-value-bounds`

[HTML Living Standard §4.10.14 (the meter element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element) が定める不等式を検証します。

- `min ≤ value ≤ max`
- `min ≤ low ≤ max`（`low` 指定時）
- `min ≤ high ≤ max`（`high` 指定時）
- `min ≤ optimum ≤ max`（`optimum` 指定時）
- `low ≤ high`（両方が指定されたとき）

`min` 省略時は `0`、`max` 省略時は `1`、`value` 省略時は `min` を既定値として用います。属性値そのものがパースできない場合は [`invalid-attr`](../invalid-attr/) ルールが扱うため、本ルールは検査をスキップします。

❌ このルールに適合しない**誤った**コードの例

```html
<meter value="10" max="5">10 out of 5</meter>
<meter value="5" min="3" optimum="1">5</meter>
<meter value="5" low="8" high="3">5</meter>
```

✅ このルールに適合する**正しい**コードの例

```html
<meter value="0.5">half</meter> <meter value="5" min="0" max="10" low="3" high="7" optimum="6">5</meter>
```
