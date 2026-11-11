---
id: require-h1
description: Warn if there is no h1 element in the document.
---

# `require-h1`

Warn if there is no h1 element in the document.

This rule is based on [Techniques H42](https://www.w3.org/WAI/WCAG22/Techniques/html/H42) for [Success Criterion 1.3.1](https://www.w3.org/TR/WCAG/#info-and-relationships) in WCAG, [Practices for skipping heading level](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#Accessibility_concerns) and [Web Accessibility Tutorials - Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/).

The `h1` element of the document is what is required: the content of a `template` element and a declarative shadow root are trees of their own, where it is not known from the markup where they are inserted, so an `h1` in them does not satisfy it. In React and Vue, the children of a `template` element without a directive are in the tree of the document.

Split out of the former `required-h1` rule, alongside [`no-duplicate-h1`](/docs/rules/no-duplicate-h1).

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
