---
title: attr-equal-space-after
fixable: true
---

# Spaces after the "equal" of attribute (`attr-equal-space-after`)

Warns that there is spaces **after** `=` of attribute, or that there is not spaces. You can also set not to allow line breaks. The rule of the space **before** `=` is set by [`attr-equal-space-before`](../markuplint-rule-attr-equal-space-before).

**🔧 Fixable**

## Rule Details

### `"never"`

Warns that there is spaces **after** `=` of attribute.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src= "path/to">
<img src = "path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img src ="path/to">
<img
	src
	="path/to">
```
<!-- prettier-ignore-end -->

### `"always"`

Warns that there is not spaces **after** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img
	src
	="path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src= "path/to">
<img src = "path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```
<!-- prettier-ignore-end -->

### `"never-single-line"`

Warns that there is not spaces **after** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src= "path/to">
<img src = "path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img src ="path/to">
<img
	src
	="path/to">
<img
	src=
	"path/to">
<img
	src
	=
	"path/to">
```
<!-- prettier-ignore-end -->

### `"always-single-line"`

Warns that there is not spaces **after** `=` of attribute. But warns if there is line breaks.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img
	src
	="path/to">
<img
	src=
	"path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src= "path/to">
<img src = "path/to">
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"always" | "never" | "always-single-line" | "never-single-line"`

| value                  | default | description                                                                                        |
| ---------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `"never"`              | ✓       | Warns that there is spaces **after** `=` of attribute.                                             |
| `"always"`             |         | Warns that there is not spaces **after** `=` of attribute. Line breaks are included in the spaces. |
| `"never-single-line"`  |         | Warns that there is not spaces **after** `=` of attribute. Line breaks are included in the spaces. |
| `"always-single-line"` |         | Warns that there is not spaces **after** `=` of attribute. But warns if there is line breaks.      |

### Default notification severity

`warning`
