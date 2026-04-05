---
id: wai-aria-no-global-prop
description: Warns when a non-global ARIA property is used on an element without an explicit role.
---

# `wai-aria-no-global-prop`

Warns when a non-global ARIA property is used on an element without an explicit role.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div aria-pressed="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div aria-label="text"></div>
```
