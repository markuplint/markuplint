---
title: indentation
fixable: true
---

# Indentation (`indentation`)

Warns that indentation is not unified.

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<div>
  <span>lorem</span>
	ipsam
   </div>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div>
	<span>lorem</span>
	ipsam
</div>
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"tab" | number`

| value    | default | description                                                                 |
| -------- | ------- | --------------------------------------------------------------------------- |
| `"tab"`  |         | Unify indentation with tab characters.                                      |
| [Number] | `2`     | Unified with the space of the width of the numerical value with indent set. |

### Default notification level

`warning`
