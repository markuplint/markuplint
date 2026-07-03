---
id: wai-aria-disallowed-props
description: Warns when an ARIA property or state is disallowed on the element's computed role, on a specific element type, or by the naming-prohibition rule.
---

# `wai-aria-disallowed-props`

Warns when an ARIA property or state is disallowed in any of the following ways defined by [ARIA in HTML](https://w3c.github.io/html-aria/):

1. **Not allowed on the computed role** — e.g. `aria-pressed` on `role="heading"`.
2. **Naming prohibition** — elements without an implicit role (`<cite>`, `<abbr>`, `<figcaption>`, etc.) and autonomous custom elements (`<my-widget>`, etc.) must not use `aria-label`, `aria-labelledby`, or `aria-braillelabel` unless an explicit naming-supported role is set. Customised-built-in elements (`<button is="x-y">`) inherit the host element's spec data and follow the regular path.
3. **Element-specific prohibitions** — every `aria-*` attribute is forbidden on certain element states (e.g. `<input type="hidden">`), and individual attributes may be forbidden when another attribute is present or when the element sits in a specific parent context (e.g. `aria-expanded` on `<button popovertarget>` or `<button commandfor>` because the popover / Invoker Commands API manages the state automatically; `aria-expanded` and `aria-pressed` on the first `<summary>` inside `<details>` because the expanded state maps to the `open` attribute).
4. **Element-specific whitelist** — some elements accept only a small set of `aria-*` attributes (e.g. `<br>` and `<wbr>` accept only `aria-hidden`); any attribute outside the whitelist is rejected.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
<cite aria-label="x">y</cite>
<my-widget aria-label="x">y</my-widget>
<br aria-atomic="true" />
<input type="hidden" aria-hidden="true" />
<button popovertarget="p" aria-expanded="false">Toggle</button>
<button command="toggle-popover" commandfor="p" aria-expanded="false">Toggle</button>
<details>
  <summary aria-expanded="false">Summary</summary>
</details>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
<cite role="button" aria-label="x">y</cite>
<my-widget role="button" aria-label="x">y</my-widget>
<br aria-hidden="true" />
<input type="hidden" />
<button popovertarget="p">Toggle</button>
<button command="toggle-popover" commandfor="p">Toggle</button>
<details>
  <summary>Summary</summary>
</details>
```
