---
id: input-button-non-empty-value
description: Forbid an empty value attribute on <input type="button"> elements; if specified the value must be non-empty.
---

# `input-button-non-empty-value`

Per [HTML Living Standard §4.10.5.1.21 (Button state)](<https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)>) the user agent uses the `value` attribute as the button label. The attribute may be omitted (the UA provides a default label), but a _specified_ `value` must not be the empty string. This rule reports the explicit empty-string case and leaves missing-value handling alone.

❌ Examples of **incorrect** code for this rule

```html
<input type="button" value="" />
```

✅ Examples of **correct** code for this rule

```html
<input type="button" value="OK" /> <input type="button" />
```
