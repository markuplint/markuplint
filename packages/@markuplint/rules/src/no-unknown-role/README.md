---
id: no-unknown-role
description: Warns when a role attribute value does not exist in the WAI-ARIA specification.
---

# `no-unknown-role`

Warns when a role attribute value does not exist in the WAI-ARIA specification.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="hoge"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button"></div>
```
