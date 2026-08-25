---
id: no-deprecated-aria-prop
description: Warns when a deprecated ARIA property or state is used on a role.
---

# `no-deprecated-aria-prop`

Warns when a deprecated ARIA property or state is used on a role.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="img" aria-disabled="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
