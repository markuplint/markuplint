---
id: aria-prop-requires-role
description: Warns when a non-global ARIA property is used on an element without an explicit role.
---

# `aria-prop-requires-role`

Warns when a non-global ARIA property is used on an element without an explicit role.

❌ Examples of **incorrect** code for this rule

```html
<div aria-pressed="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div aria-label="text"></div>
```
