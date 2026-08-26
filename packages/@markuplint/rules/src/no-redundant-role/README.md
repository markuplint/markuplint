---
id: no-redundant-role
description: Warns when the explicit role attribute duplicates the element's implicit role.
---

# `no-redundant-role`

Warns when the explicit role attribute duplicates the element's implicit role.

❌ Examples of **incorrect** code for this rule

```html
<nav role="navigation"></nav>
```

✅ Examples of **correct** code for this rule

```html
<nav role="menu"></nav>
```
