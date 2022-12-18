---
id: character-reference
description: Character reference
category: style
severity: error
---

# `character-reference`

Warns when unauthorized illegal characters are not escaped with character reference in the text node or attribute value.

> In certain cases described in other sections, text may be mixed with **character references**. These can be used to escape characters that couldn't otherwise legally be included in text.

Cite: https://html.spec.whatwg.org/#syntax-charref

:::note

This rule doesn't evaluate the characters strictly. Take care that it prompts you to change even if a character doesn't need to escape in a valid location.

:::

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<div id="a"> > < & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div id="a"> &gt; &lt; &amp; &quot; </div>
<img src="path/to?a=b&amp;c=d">
```
<!-- prettier-ignore-end -->
