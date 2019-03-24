---
title: permitted-role
---

# Permitted "role" attribute (`permitted-role`)

Warns when there is an unpermitted value of "role" attribute defined.

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

### Options

none

### Default notification level

`error`