---
title: doctype
fixable: false
---

# DOCTYPE declaration (`doctype`)

Warns when doesn't declare DOCTYPE. Also warns when declared obsolete type.

## Rule Details

👎 Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<html>
	<head>
		<title>Any Page</title>
	</head>
	<body>
		<h1>Any Page</h1>
		<p>Anonymous</p>
	</body>
</html>
```
<!-- prettier-ignore-end -->

👍 Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<!doctype html>
<html>
	<head>
		<title>Any Page</title>
	</head>
	<body>
		<h1>Any Page</h1>
		<p>Anonymous</p>
	</body>
</html>
```
<!-- prettier-ignore-end -->

### Setting value

Type: `"always"`

| value      | default | description                                                           |
| ---------- | ------- | --------------------------------------------------------------------- |
| `"always"` | ✓       | Warns when doesn't declare DOCTYPE. Ignore when document is fragment. |

### オプション

#### `denyObsolateType`

Type: `boolean`

| value   | default | description                                   |
| ------- | ------- | --------------------------------------------- |
| `true`  | ✓       | Warns that the type is not `<!doctype html>`. |
| `false` |         | Allow any type.                               |

### Default severity

`error`
