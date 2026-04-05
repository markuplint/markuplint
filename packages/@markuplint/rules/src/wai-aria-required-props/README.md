---
id: wai-aria-required-props
description: Warns when required ARIA properties for a role are missing.
---

# `wai-aria-required-props`

Warns when required ARIA properties for a role are missing.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="slider"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="slider" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div>
```
