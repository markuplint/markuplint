---
id: wai-aria-implicit-props
description: Warns when an ARIA property duplicates or contradicts semantics provided by a native HTML attribute.
---

# `wai-aria-implicit-props`

Warns when an ARIA property duplicates or contradicts semantics provided by a native HTML attribute.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" aria-checked="true" checked />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```
