---
id: no-prohibited-naming
description: Warns when aria-label, aria-labelledby, or aria-braillelabel is used on a naming-prohibited element.
---

# `no-prohibited-naming`

Warns when `aria-label`, `aria-labelledby`, or `aria-braillelabel` is used on an element where [ARIA in HTML](https://w3c.github.io/html-aria/#dfn-naming-prohibited) prohibits naming: elements without an implicit role (`<cite>`, `<abbr>`, `<figcaption>`, etc.) and autonomous custom elements (`<my-widget>`, etc.) must not use these attributes unless an explicit naming-supported role is set. Customised-built-in elements (`<button is="x-y">`) inherit the host element's spec data and follow the regular path.

Split out of the former `wai-aria-disallowed-props` rule, alongside [`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop) and [`role-supports-aria-prop`](/docs/rules/role-supports-aria-prop).

❌ Examples of **incorrect** code for this rule

```html
<cite aria-label="x">y</cite> <my-widget aria-label="x">y</my-widget>
```

✅ Examples of **correct** code for this rule

```html
<cite role="button" aria-label="x">y</cite> <my-widget role="button" aria-label="x">y</my-widget>
```
