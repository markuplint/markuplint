---
id: no-extra-selected-options
description: Disallow multiple selected option elements in a select that lacks the multiple attribute.
---

# `no-extra-selected-options`

Per [HTML Living Standard §4.10.7 (the select element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element), a `<select>` element without the `multiple` attribute may have at most one option in its list of options whose `selected` attribute is set.

The "list of options" covers direct `<option>` children of `<select>` and `<option>` children of any `<optgroup>` children.

❌ Examples of **incorrect** code for this rule

```html
<select>
  <option selected>One</option>
  <option selected>Two</option>
</select>
```

✅ Examples of **correct** code for this rule

```html
<select>
  <option selected>One</option>
  <option>Two</option>
</select>
<select multiple>
  <option selected>One</option>
  <option selected>Two</option>
</select>
```
