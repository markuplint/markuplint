---
id: no-boolean-attr-value
description: Warn when it specified any value to the boolean attribute.
---

# `no-boolean-attr-value`

Warn when it specified any value to the boolean attribute.

:::info

Not included in any preset: HTML permits a boolean attribute to carry any value (only its presence matters), so disallowing one is purely a project style preference.

:::

❌ Examples of **incorrect** code for this rule

```html
<input type="text" required="required" />
```

✅ Examples of **correct** code for this rule

```html
<input type="text" required />
```
