---
id: wai-aria-disallowed-props
description: Warns when an ARIA property or state is not allowed on the element's computed role or is subject to naming prohibition.
---

# `wai-aria-disallowed-props`

Warns when an ARIA property or state is not allowed on the element's computed role.
Also enforces the "naming prohibition" constraint defined by [ARIA in HTML](https://w3c.github.io/html-aria/#dfn-naming-prohibited): elements without an implicit role (such as `<cite>`, `<abbr>`, `<figcaption>`) must not use `aria-label`, `aria-labelledby`, or `aria-braillelabel` unless an explicit role that supports naming is set.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
<cite aria-label="x">y</cite>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
<cite role="button" aria-label="x">y</cite>
```
