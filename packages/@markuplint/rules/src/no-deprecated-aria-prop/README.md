---
id: no-deprecated-aria-prop
description: Warns when a deprecated ARIA property or state is used on a role.
---

# `no-deprecated-aria-prop`

Warns when a deprecated ARIA property or state is used on a role.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

❌ Examples of **incorrect** code for this rule

```html
<div role="img" aria-disabled="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
