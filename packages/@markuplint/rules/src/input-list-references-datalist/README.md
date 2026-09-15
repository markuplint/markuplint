---
id: input-list-references-datalist
description: Require that an input element's `list` attribute references an actual datalist element by ID.
---

# `input-list-references-datalist`

Per [HTML Living Standard §4.10.5.2](https://html.spec.whatwg.org/multipage/input.html#the-list-attribute), the `list` attribute on an `<input>` element identifies the element that lists predefined options to suggest to the user. If present, its value must be the ID of a `<datalist>` element in the same tree.

ID existence itself is the responsibility of [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/). This rule fires only when the referenced ID resolves to a non-`<datalist>` element.

❌ Examples of **incorrect** code for this rule

```html
<input type="text" list="notdatalist" />
<div id="notdatalist">Not a datalist</div>
```

✅ Examples of **correct** code for this rule

```html
<input type="text" list="colors" />
<datalist id="colors">
  <option value="Red"></option>
  <option value="Green"></option>
  <option value="Blue"></option>
</datalist>
```
