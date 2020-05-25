---
title: required-attr
---

# Required attributes (`required-attr`)

Warns if specified attributes or required attribute on specs are not appeared on an element.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/tree/master/packages/%40markuplint/html-ls/src/attributes).

## Rule Details

The `src` attribute is required on `<img>` element on [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML).

👎 Example of **incorrect** code for this rule

```html
<img />
```

👍 Example of **correct** code for this rule

```html
<img src="/path/to/image.png" />
```

### Custom setting

When the `alt` attribute is required, set `{"required-attr": "alt"}`.

👎 Example of **incorrect** code for this rule

```html
<img src="/path/to/image.png" />
```

👍 Example of **correct** code for this rule

```html
<img src="/path/to/image.png" alt="alternative text" />
```

### Setting value

```json:title=.markuplintrc
{
	"rules": {
		"required-attr": "alt"
	}
}
```

```json:title=.markuplintrc
{
	"rules": {
		"required-attr": ["alt", "src"]
	}
}
```

Type: `string | string[]`

| value              | default | description                                                                         |
| ------------------ | ------- | ----------------------------------------------------------------------------------- |
| `"attribute-name"` | []      | Attribute name string or array of attribute names to warn if they are not appeared. |

## Configuration Example

Since we ordinary want to configure required attributes for each element type, `required-attr` rule should be configured in the `nodeRules` option.

Example configuration that `alt` attribute must be required on `<img>` element:

```json:title=.markuplintrc
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
