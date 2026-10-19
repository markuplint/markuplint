---
id: no-redundant-aria-prop
description: Warns when an ARIA property redundantly restates the same semantics as an equivalent native HTML attribute.
---

# `no-redundant-aria-prop`

Warns when an ARIA property has the same value as (or the same implicit default as) an equivalent native HTML attribute, per [ARIA in HTML §4](https://www.w3.org/TR/html-aria/#docconformance)'s recommendation to prefer the native attribute.

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

Split out of the former `wai-aria-implicit-props` rule, alongside [`no-contradictory-aria-prop`](/docs/rules/no-contradictory-aria-prop). This half stays `should`-level (`warning`); the contradicting half is `must`-level (`error`).

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" checked aria-checked="true" />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```
