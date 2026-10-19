---
id: no-aria-on-presentational-children
description: Warns when ARIA attributes are set on descendants of roles with presentational children.
---

# `no-aria-on-presentational-children`

Warns when ARIA attributes are set on descendants of roles with presentational children.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

❌ Examples of **incorrect** code for this rule

```html
<div role="img"><span aria-label="text"></span></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="img"><span>text</span></div>
```
