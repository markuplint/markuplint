---
title: character-reference
---

# Character reference (`character-reference`)

Warns when unauthorized illegal characters are not escaped with character reference in the text node or attribute value.

> In certain cases described in other sections, text may be mixed with **character references**. These can be used to escape characters that couldn't otherwise legally be included in text.
> [cite: https://html.spec.whatwg.org/#syntax-charref]

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<div id="a">> < & "</div>
<img src="path/to?a=b&c=d" />
```

👍 Examples of **correct** code for this rule

```html
<div id="a">&gt; &lt; &amp; &quot;</div>
<img src="path/to?a=b&amp;c=d" />
```

### Options

none

### Default notification level

`error`
