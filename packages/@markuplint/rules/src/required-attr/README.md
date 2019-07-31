---
title: required-attr
---

# Required attributes (`required-attr`)

Warns if specified attributes are not appeared on an element.

## Rule Details

:-1: Example of **incorrect** code for this rule

`{ "required-attr": "alt" }`

```html
<img src="/path/to/image.png" />
```

:+1: Example of **correct** code for this rule

`{ "required-attr": "alt" }`

```html
<img src="/path/to/image.png" alt="alternative text" />
```

### Options

| value              | default | description                                                                         |
| ------------------ | ------- | ----------------------------------------------------------------------------------- |
| `"attribute-name"` | []      | Attribute name string or array of attribute names to warn if they are not appeared. |

## Configuration Example

Since we ordinary want to configure required attributes for each element type, `required-attr` rule should be configured in the `nodeRules` option.

Example configuration that `alt` attribute must be required on `<img>` element:

```json
{
	"rules": {
		"required-attr": true
	},
	"nodeRules": [
		{
			"tagName": "img",
			"rules": {
				"required-attr": "alt"
			}
		}
	]
}
```
