---
id: no-invalid-aria-prop-value
description: Warns when an ARIA property or state value does not conform to its expected type.
---

# `no-invalid-aria-prop-value`

Warns when an ARIA property or state value does not conform to its expected type.

❌ Examples of **incorrect** code for this rule

```html
<div role="button" aria-pressed="hoge"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
