---
id: no-aria-on-unsupported-element
description: Disallows ARIA attributes on elements that don't support ARIA at all.
---

# `no-aria-on-unsupported-element`

Disallows the `role` attribute and any `aria-*` attribute on an element whose HTML specification data marks it as not supporting ARIA attributes at all, per [ARIA in HTML's document conformance requirements](https://www.w3.org/TR/html-aria/#docconformance).

The names of ARIA attributes are compared as [`no-unknown-attr`](/docs/rules/no-unknown-attr#attribute-name-case) compares names (see its "Attribute name case" section): `ARIA-LABEL` is the same attribute as `aria-label` where the DOM treats attribute names as case-insensitive, such as on an HTML element, and a different one where it does not, such as on an `<svg>` element in JSX.

:::info

Extracted from the former `wai-aria` umbrella rule (#3989), which always performed this check first, unconditionally, before any of its other checks.

:::

## Default Severity

`error`

## Examples

This rule reports a violation for any `role` or `aria-*` attribute found on an element whose spec data disallows ARIA attributes entirely. No element in markuplint's bundled HTML, SVG, or MathML spec data currently disallows ARIA attributes this way, so there is no incorrect-code example to show today — this rule stays ready for a future spec update that introduces one.

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="false"></div>
```
