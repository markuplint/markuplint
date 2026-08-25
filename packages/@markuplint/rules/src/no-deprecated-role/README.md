---
id: no-deprecated-role
description: Warns when a deprecated WAI-ARIA role is used.
---

# `no-deprecated-role`

Warns when a deprecated WAI-ARIA role is used.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="directory"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="list"></div>
```
