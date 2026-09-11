---
id: no-default-value
description: Warn when it specifies the default value to the attribute.
---

# `no-default-value`

Warn when it specifies the default value to the attribute.

:::info

Not included in any preset: writing an attribute's default value explicitly is redundant but harmless, so flagging it is purely a project style preference.

:::

❌ Examples of **incorrect** code for this rule

```html
<canvas width="300" height="150"></canvas>
```

✅ Examples of **correct** code for this rule

```html
<canvas></canvas>
```
