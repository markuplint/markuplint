---
title: required-h1
---

# level-one heading in document required (`required-h1`)

Warn if there is no h1 element in the document.

This rule is based on [Techniques H42](https://www.w3.org/WAI/WCAG21/Techniques/html/H42) for [Success Criterion 1.3.1](https://www.w3.org/TR/WCAG21/#info-and-relationships) in WCAG, [Practices for skipping heading level](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#Accessibility_concerns) and [Web Accessibility Tutorials - Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/).

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<html>
	<head>
		<title>page</title>
	</head>
	<body>
		<main>
			<p>text</p>
		</main>
	</body>
</html>
```

👍 Examples of **correct** code for this rule

```html
<html>
	<head>
		<title>page</title>
	</head>
	<body>
		<main>
			<h1>heading</h1>
			<p>text</p>
		</main>
	</body>
</html>
```

### Setting value

-   Type: `boolean`
-   Optional
-   Default value: `true`

### Options

### `expected-once`

Warn if there is a duplicate `h1` tag in the document.

-   Type: `boolean`
-   Optional
-   Default value: `true`

### `in-document-fragment`

Set it to `true` if you want this rule to apply within document fragment rather than the entire document.

-   Type: `boolean`
-   Optional
-   Default value: `false`

### Default severity

`error`
