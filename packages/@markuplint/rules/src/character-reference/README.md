---
id: character-reference
description: Warns when unauthorized illegal characters are not escaped with character reference in the text node or attribute value.
---

# `character-reference`

Warns when unauthorized illegal characters are not escaped with character reference in the text node or attribute value.

> In certain cases described in other sections, text may be mixed with **character references**. These can be used to escape characters that couldn't otherwise legally be included in text.

Cite: [HTML Living Standard 13.1.4 Character references](https://html.spec.whatwg.org/multipage/syntax.html#syntax-charref:~:text=In%20certain%20cases%20described%20in%20other%20sections%2C%20text%20may%20be%20mixed%20with%20character%20references.%20These%20can%20be%20used%20to%20escape%20characters%20that%20couldn%27t%20otherwise%20legally%20be%20included%20in%20text.)

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
