---
title: Disallow to specify any value to the boolean attribute
id: no-boolean-attr-value
fixable: true
category: style
---

# Disallow to specify any value to the boolean attribute

Warn when it specified any value to the boolean attribute.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<input type="text" required="required" />
```

👍 Examples of **correct** code for this rule

```html
<input type="text" required />
```

### Interface

- Type: `boolean`
- Default Value: `true`

### Default severity

`warning`
