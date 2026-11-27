---
id: no-invalid-aria-prop-value
description: Warns when an ARIA property or state value does not conform to its expected type.
---

# `no-invalid-aria-prop-value`

Warns when an ARIA property or state value does not conform to its expected type.

A value is read as the computed ARIA properties read it: a keyword (`true`, `mixed`, a token of `aria-live`, …) is compared without regard to ASCII case and with no white space around it, as browsers compare it (`" true "` is not `true`), a number is the whole value with ASCII white space around it ignored, and an ID reference is one id, with no white space in it. An empty value is the absent attribute and is not reported, except for a property that the element requires by its explicit role (`aria-checked` of `role="checkbox"`; an implicit role is satisfied by the element itself):

> Authors MAY specify a zero-length string ("") for any supported (but not required) state or property.

Cite: [WAI-ARIA — State and Property Attribute Processing](https://w3c.github.io/aria/#state_property_processing)

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

The role of an element is not known until it is rendered when its `role` attribute has a value that code gives (`role={props.role}`), when it has a spread attribute (`{...props}`) after its `role` attribute, or when it has a spread attribute and no `role` attribute: the spread may bring the role. For a property whose allowed values depend on the role (e.g. `mixed` of `aria-checked`), a value of such an element is reported only if no role allows it.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-pressed="hoge"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
