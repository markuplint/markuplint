---
id: no-default-aria-value
description: Warns when an ARIA property is explicitly set to its spec-defined default value.
---

# `no-default-aria-value`

Warns when an ARIA property is explicitly set to its spec-defined default value.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-expanded="undefined"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-expanded="true"></div>
```
