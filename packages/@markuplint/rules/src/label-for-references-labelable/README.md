---
id: label-for-references-labelable
description: Require that a `label` element's `for` attribute references an actual labelable element by ID.
---

# `label-for-references-labelable`

Per [HTML Living Standard §4.10.4](https://html.spec.whatwg.org/multipage/forms.html#attr-label-for), the `for` attribute on a `<label>` element identifies the labeled control. If present, its value must be the ID of a [labelable element](https://html.spec.whatwg.org/multipage/forms.html#category-label) in the same tree — `button`, `input` (except when `type="hidden"`), `meter`, `output`, `progress`, `select`, or `textarea`.

ID existence itself is the responsibility of [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/). This rule fires only when the referenced ID resolves to a non-labelable element.

❌ Examples of **incorrect** code for this rule

```html
<label for="notaformcontrol">Label</label>
<div id="notaformcontrol">Just a div</div>
```

✅ Examples of **correct** code for this rule

```html
<label for="username">Username</label> <input type="text" id="username" />
```
