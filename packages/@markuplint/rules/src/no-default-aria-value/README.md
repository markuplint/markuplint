---
id: no-default-aria-value
description: Warns when an ARIA property is explicitly set to its spec-defined default value.
---

# `no-default-aria-value`

Warns when an ARIA property is explicitly set to its spec-defined default value.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-expanded="undefined"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-expanded="true"></div>
```
