---
title: Disallowed elements
id: disallowed-element
category: validation
---

# Disallowed elements

Warns if specified elements appear on a document or an element. Use the selector to specify.

This is a generic rule for searching the disallowed element.

Use [`permitted-contents`](../permitted-contents) rule if you expect to check conformance according to HTML Standard.

## Rule Details

When specified `{ "required-element": ["hgroup"] }`:

👎 Examples of **incorrect** code for this rule

```html
<div>
	<hgroup><h1>Heading</h1></hgroup>
</div>
```

👍 Examples of **correct** code for this rule

```html
<div>
	<h1>Heading</h1>
</div>
```

If specified to `rules`, It searches the element from a document.

```json
{
	"rules": {
		"required-element": ["hgroup"]
	}
}
```

If specified to `nodeRules` or `childNodeRules`, It searches the element from child elements of the target element.

```json
{
	"nodeRules": [
		{
			"selector": "h1, h2, h3, h4, h5, h6",
			"rules": {
				"required-element": ["small"]
			}
		}
	]
}
```

### Interface

-   Type: `string[]`
-   Deafult Value: `[]`

### Default severity

`error`
