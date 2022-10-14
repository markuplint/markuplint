---
title: Disallow referring to non-existent ID
id: no-refer-to-non-existent-id
category: a11y
---

# Disallow referring to non-existent ID

Checking for whether **ID** or **the list of ID** specified to `for`, `form`, `aria-*` and, more are referencing to it that existed in the same document.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

👍 Examples of **correct** code for this rule

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```

### Interface

- Type: `boolean`
- Default Value: `true`

### Default severity

`error`
