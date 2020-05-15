---
title: deprecated-element
---

# Deprecated elements (`deprecated-element`)

Warns when there is an element defined as **deprecated** or **obsolete** or **non-standard**.

This rule refer [HTML Living Standard](https://html.spec.whatwg.org/) based [MDN Web docs](https://developer.mozilla.org/en/docs/Web/HTML). It has settings in [`@markuplint/html-ls`](https://github.com/markuplint/markuplint/blob/master/packages/%40markuplint/html-ls/index.json).

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<font color="red">lorem</font>
```

👍 Examples of **correct** code for this rule

```html
<span class="red">lorem</span>
```

### Setting value

none

### Default severity

`error`
