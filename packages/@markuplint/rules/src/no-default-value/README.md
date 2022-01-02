---
title: Disallow to specify the default value
id: no-default-value
category: style
---

# Disallow to specify the default value

Warn when it specifies the default value to the attribute.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<canvas width="300" height="150"></canvas>
```

👍 Examples of **correct** code for this rule

```html
<canvas></canvas>
```

### Interface

-   Type: `boolean`
-   Deafult Value: `true`

### Default severity

`warning`
