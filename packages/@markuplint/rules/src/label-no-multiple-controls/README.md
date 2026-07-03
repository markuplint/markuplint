---
id: label-no-multiple-controls
description: Enforce the descendant-control constraints on a label element per HTML LS §4.10.4.
---

# `label-no-multiple-controls`

Per [HTML Living Standard §4.10.4 (the label element)](https://html.spec.whatwg.org/multipage/forms.html#the-label-element), a `<label>`'s content model permits _"no descendant labelable elements unless it is the element's labeled control"_. Two branches follow:

- When `for` resolves to an external labelable element, that external element is the labeled control — the label must have no form-control descendants inside.
- Otherwise, at most one form-control descendant (`button`, `input`, `meter`, `output`, `progress`, `select`, `textarea`) is allowed; the first in tree order is the labeled control.

This rule enforces both branches. `for` referencing a non-labelable element is reported by [`label-for-references-labelable`](../label-for-references-labelable/); missing target IDs are reported by [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/). The a11y heuristic that every label associates with a control is handled by [`label-has-control`](../label-has-control/).

❌ Examples of **incorrect** code for this rule

```html
<label>Name: <input type="text" name="first" /> <input type="text" name="last" /></label>
```

```html
<input id="username" /> <label for="username"><input /></label>
```

✅ Examples of **correct** code for this rule

```html
<label>Name: <input type="text" name="full" /></label> <label for="meter1">Score:</label>
<meter id="meter1" value="3" max="10">3</meter>
```

```html
<input id="username" /> <label for="username">Username</label>
```
