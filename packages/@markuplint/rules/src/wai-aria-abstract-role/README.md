---
id: wai-aria-abstract-role
description: Warns when an abstract WAI-ARIA role is used.
---

# `wai-aria-abstract-role`

Warns when an abstract WAI-ARIA role is used.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="roletype"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button"></div>
```
