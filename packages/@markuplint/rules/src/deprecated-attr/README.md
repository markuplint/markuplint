---
id: deprecated-attr
description: Warns when there is an attribute defined as deprecated or obsolete.
category: validation
severity: error
---

# `deprecated-attr`

Warns when there is an attribute defined as **deprecated** or **obsolete**.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/html-spec/index.json).

❌ Examples of **incorrect** code for this rule

```html
<img src="path/to" alt="any picture" align="top" />
```

✅ Examples of **correct** code for this rule

```html
<img src="path/to" alt="any picture" style="vertical-align: center" />
```
