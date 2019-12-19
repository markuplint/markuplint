---
title: attr-role
---

# Permitted "role" attribute (`attr-role`)

Warns when tag is set unpermitted value of "role" attribute defined in standard or that is overrode default role.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<a role="document">lorem</a>
```

👍 Examples of **correct** code for this rule

```html
<a role="button">lorem</span>
```

### Setting value

none

### Default severity

`error`
