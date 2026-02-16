---
id: deprecated-element
description: Warns when there is an element defined as deprecated or obsolete.
---

# `deprecated-element`

Warns when there is an element defined as **deprecated** or **obsolete**.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

> **Note:** Non-standard element detection has been moved to [`no-unsupported-features`](../no-unsupported-features/README.md) with the `checkNonStandard` option.

❌ Examples of **incorrect** code for this rule

```html
<font color="red">lorem</font>
```

✅ Examples of **correct** code for this rule

```html
<span class="red">lorem</span>
```
