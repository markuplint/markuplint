---
id: no-boolean-attr-value
description: Warn when it specified any value to the boolean attribute.
fixable: true
category: style
severity: warning
---

# `no-boolean-attr-value`

Warn when it specified any value to the boolean attribute.

❌ Examples of **incorrect** code for this rule

```html
<input type="text" required="required" />
```

✅ Examples of **correct** code for this rule

```html
<input type="text" required />
```
