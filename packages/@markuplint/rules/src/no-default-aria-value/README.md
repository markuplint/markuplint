---
id: no-default-aria-value
description: Warns when an ARIA property is explicitly set to its spec-defined default value.
---

# `no-default-aria-value`

Warns when an ARIA property is explicitly set to its spec-defined default value.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-expanded="undefined"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-expanded="true"></div>
```
