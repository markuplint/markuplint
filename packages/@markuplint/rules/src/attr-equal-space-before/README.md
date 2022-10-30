---
title: Spaces before the "equal" of attribute
id: attr-equal-space-before
fixable: true
category: style
---

# Spaces before the "equal" of attribute

Warns that there is spaces **before** `=` of attribute, or that there is not spaces. You can also set not to allow line breaks. The rule of the space **after** `=` is set by [`attr-equal-space-after`](../attr-equal-space-after).

**🔧 Fixable**

## Rule Details

### `"never"`

Warns that there is spaces **before** `=` of attribute.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src ="path/to">
<img src = "path/to">
<img
	src
	="path/to">
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
<img src= "path/to">
<img
	src=
	"path/to">
```
<!-- prettier-ignore-end -->

### `"always"`

Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img
	src=
	"path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src ="path/to">
<img src = "path/to">
<img
	src
	="path/to">
<img
	src
	=
	"path/to">
```
<!-- prettier-ignore-end -->

### `"never-single-line"`

Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src ="path/to">
<img src = "path/to">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to">
<img src= "path/to">
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

Warns that there is not spaces **before** `=` of attribute. But warns if there is line breaks.

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
<img src ="path/to">
<img src = "path/to">
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"always" | "never" | "always-single-line" | "never-single-line"`

| value                  | default | description                                                                                         |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `"never"`              | ✓       | Warns that there is spaces **before** `=` of attribute.                                             |
| `"always"`             |         | Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces. |
| `"never-single-line"`  |         | Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces. |
| `"always-single-line"` |         | Warns that there is not spaces **before** `=` of attribute. But warns if there is line breaks.      |

### Default severity

`warning`
