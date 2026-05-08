---
id: input-button-non-empty-value
description: Forbid an empty value attribute on <input type="button"> elements; if specified the value must be non-empty.
---

# `input-button-non-empty-value`

Forbid `<input type="button">` from carrying `value=""`. The HTML Living Standard does not state this constraint verbatim — the [Button state section §4.10.5.1.21](<https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)>) only describes that the UA renders the `value` attribute as the button label and supplies a default when the attribute is missing. The "must not be the empty string" assertion is hard-coded by [nu-validator's schematron-equiv assertions](https://github.com/validator/validator/blob/main/src/nu/validator/checker/schematronequiv/Assertions.java) (search for `must have non-empty attribute "value"`). nu reports this as an error; this rule mirrors that conformance signal but takes the conservative stance — it fires only on the explicit `value=""` case and leaves missing-value handling alone (the spec text permits omission).

❌ Examples of **incorrect** code for this rule

```html
<input type="button" value="" />
```

✅ Examples of **correct** code for this rule

```html
<input type="button" value="OK" /> <input type="button" />
```
