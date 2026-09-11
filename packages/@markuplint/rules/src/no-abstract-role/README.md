---
id: no-abstract-role
description: Warns when an abstract WAI-ARIA role is used.
---

# `no-abstract-role`

Warns when an abstract WAI-ARIA role is used.

❌ Examples of **incorrect** code for this rule

```html
<div role="roletype"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button"></div>
```
