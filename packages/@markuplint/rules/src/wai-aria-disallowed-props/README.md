---
id: wai-aria-disallowed-props
description: Warns when an ARIA property or state is disallowed on the element's computed role, on a specific element type, or by the naming-prohibition rule.
---

# `wai-aria-disallowed-props`

Warns when an ARIA property or state is disallowed in any of the following ways defined by [ARIA in HTML](https://w3c.github.io/html-aria/):

1. **Not allowed on the computed role** — e.g. `aria-pressed` on `role="heading"`.
2. **Naming prohibition** — elements without an implicit role (`<cite>`, `<abbr>`, `<figcaption>`, etc.) must not use `aria-label`, `aria-labelledby`, or `aria-braillelabel` unless an explicit naming-supported role is set.
3. **Element-specific prohibitions** — every `aria-*` attribute is forbidden on certain element states (e.g. `<input type="hidden">`), and individual attributes may be forbidden when another attribute is present (e.g. `aria-expanded` on `<button popovertarget>` because the popover API manages the state automatically).

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
<cite aria-label="x">y</cite>
<input type="hidden" aria-hidden="true" />
<button popovertarget="p" aria-expanded="false">Toggle</button>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
<cite role="button" aria-label="x">y</cite>
<input type="hidden" />
<button popovertarget="p">Toggle</button>
```
