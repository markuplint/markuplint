---
title: indentation
---

# Indentation (`indentation`)

Warns that indentation is not unified.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div>
	<span>lorem</span>
	ipsam
</div>
```

👍 Examples of **correct** code for this rule

```html
<div>
	<span>lorem</span>
	ipsam
</div>
```

### Options

| value    | default | description                                                                 |
| -------- | ------- | --------------------------------------------------------------------------- |
| `"tab"`  |         | Unify indentation with tab characters.                                      |
| [Number] | `2`     | Unified with the space of the width of the numerical value with indent set. |

### Default notification level

`warning`
