---
id: form-attr-references-form
description: Require that a form-associated element's `form` attribute references an actual form element by ID.
---

# `form-attr-references-form`

Per [HTML Living Standard §4.10.18.6](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fae-form), the `form` attribute on a form-associated element (`button`, `fieldset`, `input`, `label`, `meter`, `object`, `output`, `progress`, `select`, `textarea`) must, when specified, be the ID of a `<form>` element in the element's tree.

ID existence itself is the responsibility of [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/). This rule fires only when the referenced ID resolves to a non-`<form>` element.

❌ Examples of **incorrect** code for this rule

```html
<div id="notaform">Not a form</div>
<input type="text" form="notaform" />
```

✅ Examples of **correct** code for this rule

```html
<form id="form1"><!-- ... --></form>
<input type="text" form="form1" />
```
