---
title: Spaces between attributes
id: attr-spacing
fixable: true
cateogry: style
---

# Spaces between attributes

Warn about the existence or number of spaces and tabs between attributes.

**🔧 Fixable**

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to"src="path/to2">
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<img src="path/to" src="path/to2">
```
<!-- prettier-ignore-end -->

### Setting value

Type: `boolean`

### Options

#### `lineBreak`

Type: `"either" | "always" | "never"`

| value      | default | description                   |
| ---------- | ------- | ----------------------------- |
| `"either"` | ✓       | Not warn about line-break.    |
| `"always"` |         | Warn if not exist line-break. |
| `"never"`  |         | Warn if exist line-break.     |

#### `width`

Type: `number | false`

| value    | default | description                                  |
| -------- | ------- | -------------------------------------------- |
| [number] | ✓ `1`   | Warn if not equal spaces and the set number. |
| `false`  |         | Not warn about spaces.                       |

### Default notification severity

`warning`
