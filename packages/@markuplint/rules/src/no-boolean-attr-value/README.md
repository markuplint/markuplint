---
title: Disallow to specify any value to the boolean attribute
id: no-boolean-attr-value
fixable: true
category: style
severity: warning
---

# Disallow to specify any value to the boolean attribute

Warn when it specified any value to the boolean attribute.

👎 Examples of **incorrect** code for this rule

```html
<input type="text" required="required" />
```

👍 Examples of **correct** code for this rule

```html
<input type="text" required />
```
