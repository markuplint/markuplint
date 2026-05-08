---
id: meter-value-bounds
description: Enforce HTML LS inequalities between meter element attributes (min, max, value, low, high, optimum).
---

# `meter-value-bounds`

Enforce the inequalities required by [HTML Living Standard §4.10.14 (the meter element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element):

- `min ≤ value ≤ max`
- `min ≤ low ≤ max` (when `low` is specified)
- `min ≤ high ≤ max` (when `high` is specified)
- `min ≤ optimum ≤ max` (when `optimum` is specified)
- `low ≤ high` (when both are specified)

When `min` is omitted it defaults to `0`; when `max` is omitted it defaults to `1`; when `value` is omitted it defaults to `min`. Authored-but-unparsable attribute values are deferred to [`invalid-attr`](../invalid-attr/) and skipped here to avoid compounding diagnostics.

❌ Examples of **incorrect** code for this rule

```html
<meter value="10" max="5">10 out of 5</meter>
<meter value="5" min="3" optimum="1">5</meter>
<meter value="5" low="8" high="3">5</meter>
```

✅ Examples of **correct** code for this rule

```html
<meter value="0.5">half</meter> <meter value="5" min="0" max="10" low="3" high="7" optimum="6">5</meter>
```
