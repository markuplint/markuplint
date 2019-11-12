---
title: deprecated-element
---

# Deprecated elements (`deprecated-element`)

Warns when there is an element defined as deprecated in `nodeRules` in the configuration file.

To reference [HTML Living Standard](https://html.spec.whatwg.org/) rules, add [html-ls](https://github.com/YusukeHirao/markuplint/blob/master/rulesets/html-ls.json) to extends setting of configuration file.

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
