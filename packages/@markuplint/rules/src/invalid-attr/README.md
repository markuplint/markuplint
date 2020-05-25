---
title: invalid-attr
---

# Invalid Attribute (`invalid-attr`)

Warn if an attribute is a non-existent attribute or an invalid type value due to the specifications (or the custom rule).

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/tree/master/packages/%40markuplint/html-ls/src/attributes).

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

Setting custom rule.

Set either `enum`, `pattern` or `type`.

#### `enum`

Only values ​​that match the enumerated strings are allowed.

Type: `string[]`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"x-attr": {
				"enum": ["value1", "value2", "value3"]
			}
		}
	}
}
```

#### `pattern`

Only allow values ​​that match the pattern. It works as **regular expression** by enclosing it in `/`.

Type: `string`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"x-attr": {
				"pattern": "/[a-z]+/"
			}
		}
	}
}
```

#### `type`

Only values that match the specified [type](https://github.com/markuplint/markuplint/blob/master/packages/%40markuplint/ml-spec/src/types.ts#L129-L163) are allowed.

Type: `string`

```json:title=.markuplintrc
{
	"invalid-attr": {
		"option": {
			"x-attr": {
				"type": "Boolean"
			}
		}
	}
}
```

### Default severity

`error`
