---
description: Doctype declaration
id: doctype
fixable: false
category: validation
severity: error
---

# `doctype`

Warns when doesn't declare Doctype. Also warns when declared obsolete type.

❌ Examples of **incorrect** code for this rule

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

✅ Examples of **correct** code for this rule

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
