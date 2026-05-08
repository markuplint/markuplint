---
id: label-no-multiple-controls
description: Disallow more than one form-control descendant of a label element per HTML LS §4.10.4.
---

# `label-no-multiple-controls`

Per [HTML Living Standard §4.10.4 (the label element)](https://html.spec.whatwg.org/multipage/forms.html#the-label-element), a `<label>` element may contain at most one descendant form control from this list: `button`, `input`, `meter`, `output`, `progress`, `select`, `textarea`.

This rule enforces the conformance assertion. The complementary [`label-has-control`](../label-has-control/) rule covers the broader a11y heuristic (every label associates with its first control).

❌ Examples of **incorrect** code for this rule

```html
<label>Name: <input type="text" name="first" /> <input type="text" name="last" /></label>
```

✅ Examples of **correct** code for this rule

```html
<label>Name: <input type="text" name="full" /></label> <label for="meter1">Score:</label>
<meter id="meter1" value="3" max="10">3</meter>
```
