---
id: no-aria-on-unsupported-element
description: Disallows ARIA attributes on elements that don't support ARIA at all.
---

# `no-aria-on-unsupported-element`

Disallows the `role` attribute and any `aria-*` attribute on an element whose HTML specification data marks it as not supporting ARIA attributes at all.

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
