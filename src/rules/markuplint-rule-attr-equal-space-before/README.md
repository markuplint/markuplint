# Spaces before the "equal" of attribute (`attr-equal-space-before`)

Warns that there is spaces **before** `=` of attribute, or that there is not spaces. You can also set not to allow line breaks. The rule of the space **after** `=` is set by [`attr-equal-space-after`](../markuplint-rule-attr-equal-space-after).

## Rule Details

### `"never"`

Warns that there is spaces **before** `=` of attribute.

👎 Examples of **incorrect** code for this rule

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

👍 Examples of **correct** code for this rule

```html
<img src="path/to">
<img src= "path/to">
<img
	src=
	"path/to">
```

### `"always"`

Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

```html
<img src="path/to">
<img
	src=
	"path/to">
```

👍 Examples of **correct** code for this rule

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

### `"never-single-line"`

Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.

👎 Examples of **incorrect** code for this rule

```html
<img src ="path/to">
<img src = "path/to">
```

👍 Examples of **correct** code for this rule

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

### `"always-single-line"`

Warns that there is not spaces **before** `=` of attribute. But warns if there is line breaks.

👎 Examples of **incorrect** code for this rule

```html
<img src="path/to">
<img
	src
	="path/to">
<img
	src=
	"path/to">
```

👍 Examples of **correct** code for this rule

```html
<img src ="path/to">
<img src = "path/to">
```

### Options

value|default|description
---|---|---
`"never"`|✓|Warns that there is spaces **before** `=` of attribute.
`"always"`||Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.
`"never-single-line"`||Warns that there is not spaces **before** `=` of attribute. Line breaks are included in the spaces.
`"always-single-line"`||Warns that there is not spaces **before** `=` of attribute. But warns if there is line breaks.

### Default notification severity

`warning`
