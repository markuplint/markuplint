---
id: no-aria-owns-on-presentational-children
description: Disallows `aria-owns` on an element whose role has presentational children.
---

# `no-aria-owns-on-presentational-children`

Disallows `aria-owns` on an element whose role has presentational children, such as `button`, `checkbox`, `img`, `option`, `switch` or `tab`.

> Authors MUST NOT specify aria-owns on an element which has Presentational Children.

Cite: [WAI-ARIA §5.2.9 Children Presentational](https://w3c.github.io/aria/#childrenArePresentational)

The role is the one the element has, implicit or explicit: a `<button>` has presentational children as `<div role="button">` does. The rule reports under every ARIA version, although WAI-ARIA 1.1 and 1.2 do not state this requirement.

❌ Examples of **incorrect** code for this rule

```html
<button type="button" aria-owns="save-icon">Save</button> <span id="save-icon"></span>
```

✅ Examples of **correct** code for this rule

```html
<button type="button"><span></span>Save</button>
```
