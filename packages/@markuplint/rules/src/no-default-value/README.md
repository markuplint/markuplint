---
title: Disallow to specify the default value
id: no-default-value
category: style
severity: warning
---

# Disallow to specify the default value

Warn when it specifies the default value to the attribute.

👎 Examples of **incorrect** code for this rule

```html
<canvas width="300" height="150"></canvas>
```

👍 Examples of **correct** code for this rule

```html
<canvas></canvas>
```
