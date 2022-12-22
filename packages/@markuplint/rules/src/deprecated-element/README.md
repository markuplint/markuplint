---
id: deprecated-element
description: Warns when there is an element defined as deprecated or obsolete or non-standard.
category: validation
severity: error
---

# `deprecated-element`

Warns when there is an element defined as **deprecated** or **obsolete** or **non-standard**.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/index.json).

❌ Examples of **incorrect** code for this rule

```html
<font color="red">lorem</font>
```

✅ Examples of **correct** code for this rule

```html
<span class="red">lorem</span>
```
