---
id: no-boolean-attr-value
description: Warn when it specified any value to the boolean attribute.
---

# `no-boolean-attr-value`

Warn when it specified any value to the boolean attribute.

:::info

Not included in any preset: the empty string and the name of the attribute (`required="required"`) are conforming values of a boolean attribute, so leaving the value out is purely a project style preference. A value that is neither is not conforming, and [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) reports it ([HTML Standard](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes)).

:::

❌ Examples of **incorrect** code for this rule

```html
<input type="text" required="required" />
```

✅ Examples of **correct** code for this rule

```html
<input type="text" required />
```
