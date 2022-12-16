---
description: Level-one heading in document required
id: required-h1
category: a11y
severity: error
---

# `required-h1`

Warn if there is no h1 element in the document.

This rule is based on [Techniques H42](https://www.w3.org/WAI/WCAG21/Techniques/html/H42) for [Success Criterion 1.3.1](https://www.w3.org/TR/WCAG21/#info-and-relationships) in WCAG, [Practices for skipping heading level](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#Accessibility_concerns) and [Web Accessibility Tutorials - Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/).

❌ Examples of **incorrect** code for this rule

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

✅ Examples of **correct** code for this rule

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
