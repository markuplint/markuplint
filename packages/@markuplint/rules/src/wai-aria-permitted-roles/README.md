---
id: wai-aria-permitted-roles
description: Warns when a role is not permitted on the element according to ARIA in HTML.
---

# `wai-aria-permitted-roles`

Warns when a role is not permitted on the element according to ARIA in HTML.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

❌ Examples of **incorrect** code for this rule

```html
<select role="textbox"></select>
```

✅ Examples of **correct** code for this rule

```html
<a href="path/to" role="button">text</a>
```
