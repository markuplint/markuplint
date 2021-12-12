---
title: Invalid Attribute
id: invalid-attr
category: style
---

# Invalid Attribute

Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).

This rule refers the [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src/attributes).

## Rule Details

👎 Example of **incorrect** code for this rule

```html
<div unexist-attr>
	<button tabindex="non-integer">The Button</button>
	<a href="/" referrerpolicy="invalid-value">The Anchor</a>
</div>
```

👍 Example of **correct** code for this rule

```html
<div>
	<button tabindex="0">The Button</button>
	<a href="/" referrerpolicy="no-referrer">The Anchor</a>
</div>
```

### Setting value

Type: `boolean`

### Options

#### `attrs`

Setting custom rule.

Set either `enum`, `pattern` or `type`.

##### `enum`

Only values ​​that match the enumerated strings are allowed.

Type: `string[]`

```json
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"enum": ["value1", "value2", "value3"]
				}
			}
		}
	}
}
```

##### `pattern`

Only allow values ​​that match the pattern. It works as a **regular expression** by enclosing it in `/`.

Type: `string`

```json
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"pattern": "/[a-z]+/"
				}
			}
		}
	}
}
```

##### `type`

Only values that match the specified [type](https://markuplint.dev/types) are allowed.

Type: `string`

```json
{
	"invalid-attr": {
		"option": {
			"attrs": {
				"x-attr": {
					"type": "Boolean"
				}
			}
		}
	}
}
```

#### `ignoreAttrNamePrefix`

Set prefixes to exclude special attributes or directives for the library and template engine that do not exist in the HTML specifications.

Type: `string | string[]`

```json
{
	"invalid-attr": {
		"option": {
			"ignoreAttrNamePrefix": [
				// If Angular
				"app",
				"*ng"
			]
		}
	}
}
```

In some parser, detect an attribute as a directive so ignored. (Ex: Ignore directive that starts `v-` string in the [vue-parser](https://github.com/markuplint/markuplint/tree/main/packages/@markuplint/vue-parser).)

### Default severity

`error`

## Note

This rule doesn't evaluate the element that has the **spread attribute** in some condition. For example, it disallows to set the `target` attribute to the `a` element that doesn't have the `href` attribute, but markuplint can't evaluate because doesn't know whether the spread attribute includes the `href` property.

```jsx
const Component = (props) => {
	return <a target="_blank" {...props}>;
}
```
