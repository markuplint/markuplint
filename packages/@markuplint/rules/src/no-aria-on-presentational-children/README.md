---
id: no-aria-on-presentational-children
description: Warns when ARIA attributes are set on descendants of roles with presentational children.
---

# `no-aria-on-presentational-children`

Warns when ARIA attributes are set on descendants of roles with presentational children.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<div role="img"><span aria-label="text"></span></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="img"><span>text</span></div>
```
