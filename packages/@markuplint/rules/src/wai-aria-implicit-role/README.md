---
id: wai-aria-implicit-role
description: Warns when the explicit role attribute duplicates the element's implicit role.
---

# `wai-aria-implicit-role`

Warns when the explicit role attribute duplicates the element's implicit role.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<nav role="navigation"></nav>
```

✅ Examples of **correct** code for this rule

```html
<nav role="menu"></nav>
```
