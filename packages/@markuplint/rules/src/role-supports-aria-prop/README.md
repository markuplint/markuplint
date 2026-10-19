---
id: role-supports-aria-prop
description: Warns when an ARIA property or state is disallowed on the element's computed role.
---

# `role-supports-aria-prop`

Warns when an ARIA property or state is not in the [WAI-ARIA](https://w3c.github.io/aria/) role definition's set of supported states and properties for the element's computed role — e.g. `aria-pressed` on `role="heading"`.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

Split out of the former `wai-aria-disallowed-props` rule, alongside [`no-prohibited-naming`](/docs/rules/no-prohibited-naming) and [`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop).

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
