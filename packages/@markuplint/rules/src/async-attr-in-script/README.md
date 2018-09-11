# "async" attribute in script tag  (`async-attr-in-script`)

Warn about setting / non-setting of **async attribute** in script tag.

> Scripts without async or defer attributes, as well as inline scripts, are fetched and executed immediately, before the browser continues to parse the page.
> [cite: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Script#Notes]

## Rule Details

👎 Examples of **incorrect** code for this rule

`{ "async-attr-in-script": "always" }`

```html
<script src="path/to"></script>
```

`{ "async-attr-in-script": "naver" }`

```html
<script async src="path/to"></script>
```

👍 Examples of **correct** code for this rule

`{ "async-attr-in-script": "always" }`

```html
<script async src="path/to"></script>
```

`{ "async-attr-in-script": "naver" }`

```html
<script src="path/to"></script>
```

### Options

value|default|description
---|---|---
`"always"`|✓|Warns that "async" attribute is unset.
`"never"`||Warns that "async" attribute is set.

### Default notification level

`warning`

## 設定例

When using external libraries, problems may arise if you specify the `async` attribute in the order of definition. In that case you can filter by `nodeRules`. In the following example, to avoid warning of the tag of the jQuery library, it narrows down to `nodeRules` with the selector `script [src * = "jquery" i]` and reconfigures (overwrites) `"never"`.

```html
<script src="lib/jquery.min.js"></script>
<script async src="main.js"></script>
```

```json
{
	"rules": {
		"async-attr-in-script": "always",
	},
	"nodeRules": [
		{
			"selector": "script[src*=\"jquery\"]",
			"rules": {
				"async-attr-in-script": "never"
			}
		}
	]
}
```
