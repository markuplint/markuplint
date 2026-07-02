---
id: progress-value-bounds
description: Enforce HTML LS inequalities for the progress element (value ≤ max; value ≤ 1 when max is absent).
---

# `progress-value-bounds`

Enforce the inequalities required by [HTML Living Standard §4.10.14 (the progress element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element):

- `value ≤ max` when both attributes are present.
- `value ≤ 1` when only `value` is specified (the implicit maximum).

Authored-but-unparsable attribute values, an out-of-range `max` (`≤ 0`), and a negative `value` are deferred to [`invalid-attr`](../invalid-attr/) and skipped here to avoid compounding diagnostics.

❌ Examples of **incorrect** code for this rule

```html
<progress value="10" max="5">10 of 5</progress> <progress value="1.5">150%</progress>
```

✅ Examples of **correct** code for this rule

```html
<progress value="0.5">50%</progress> <progress value="30" max="100">30%</progress>
```
