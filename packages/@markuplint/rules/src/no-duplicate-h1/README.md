---
id: no-duplicate-h1
description: Warn if there is more than one h1 element in the document.
---

# `no-duplicate-h1`

Warn if there is more than one h1 element in the document.

This rule is based on [Techniques H42](https://www.w3.org/WAI/WCAG21/Techniques/html/H42) for [Success Criterion 1.3.1](https://www.w3.org/TR/WCAG21/#info-and-relationships) in WCAG, [Practices for skipping heading level](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements#Accessibility_concerns) and [Web Accessibility Tutorials - Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/).

Split out of the former `required-h1` rule, alongside [`require-h1`](/docs/rules/require-h1).

❌ Examples of **incorrect** code for this rule

```html
<html>
  <body>
    <h1>heading</h1>
    <main>
      <h1>another heading</h1>
    </main>
  </body>
</html>
```

✅ Examples of **correct** code for this rule

```html
<html>
  <body>
    <h1>heading</h1>
    <main>
      <h2>subheading</h2>
    </main>
  </body>
</html>
```
