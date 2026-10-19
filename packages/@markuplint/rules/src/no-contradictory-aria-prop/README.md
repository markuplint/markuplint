---
id: no-contradictory-aria-prop
description: Warns when an ARIA property's value contradicts an equivalent native HTML attribute.
---

# `no-contradictory-aria-prop`

Warns when an ARIA property's value contradicts the current or implicit value of an equivalent native HTML attribute, per [ARIA in HTML §4](https://www.w3.org/TR/html-aria/#docconformance): native HTML attributes must take precedence over their ARIA equivalents.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

Split out of the former `wai-aria-implicit-props` rule, alongside [`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop). This half is `must`-level (`error`); the redundant half stays `should`-level (`warning`).

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" checked aria-checked="false" />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```
