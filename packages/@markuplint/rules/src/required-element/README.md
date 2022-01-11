---
title: Required elements
id: required-element
category: validation
---

# Required elements

Warns if specified elements didn't appear on a document or an element. Use the selector to specify.

This is a generic rule for searching the required element.

Use the [`required-h1`](../required-h1/) rule if you expect to require the h1 element. Use the [`landmark-roles`](../landmark-roles/) rule if you expect to require landmark elements. Use the [`permitted-contents`](../permitted-contents) rule if you expect to check conformance according to HTML Standard.

## Rule Details

When specified `{ "required-element": ["meta[charset=\"UTF-8\"]"] }`:

👎 Examples of **incorrect** code for this rule

```html
<head>
	<title>Page title</title>
</head>
```

👍 Examples of **correct** code for this rule

```html
<head>
	<meta charset="UTF-8" />
	<title>Page title</title>
</head>
```

If specified to `rules`, It searches the element from a document.

```json
{
	"rules": {
		"required-element": ["meta[charset=\"UTF-8\"]"]
	}
}
```

If specified to `nodeRules` or `childNodeRules`, It searches the element from child elements of the target element.

```json
{
	"nodeRules": [
		{
			"selector": "head",
			"rules": {
				"required-element": ["meta[charset=\"UTF-8\"]"]
			}
		}
	]
}
```

### Interface

-   Type: `string[]`
-   Deafult Value: `[]`

### Options

#### `ignoreHasMutableContents`

-   Type: `boolean`
-   Default: `true`

Ignore if it has mutable child elements in a preprocessor language like _Pug_ or a component library like _Vue_. (If use _Pug_ or _Vue_ need each [@markuplint/pug-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/pug-parser) and [@markuplint/vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/vue-parser))

### Default severity

`error`
