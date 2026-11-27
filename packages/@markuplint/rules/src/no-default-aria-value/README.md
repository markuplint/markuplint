---
id: no-default-aria-value
description: Warns when an ARIA property is explicitly set to its spec-defined default value.
---

# `no-default-aria-value`

Warns when an ARIA property is explicitly set to its spec-defined default value.

The value compared with is the one that the element has without the attribute: the implicit value of its role where the role gives one ("Implicit Value for Role" of [WAI-ARIA](https://w3c.github.io/aria/#implictValueForRole): `aria-live` of `alert` is `assertive`), else the default of the property. A native attribute that the element has (`min`, `max`, `checked`) decides it instead, which [`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop) compares. On an element whose role is not known until it is rendered, a property that some role gives an implicit value is not checked.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-expanded="undefined"></div>
<div role="alert" aria-live="assertive"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-expanded="true"></div>
<div role="alert" aria-live="off"></div>
```
