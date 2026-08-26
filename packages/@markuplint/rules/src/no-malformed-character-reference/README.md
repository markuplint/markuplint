---
id: no-malformed-character-reference
description: Warns when a character reference is malformed — an unknown name, a missing semicolon, or a NULL/surrogate/control/noncharacter/out-of-range numeric reference.
---

# `no-malformed-character-reference`

Warns when a `&...;`-shaped character reference is malformed: an unrecognized name, a missing terminating semicolon, or a numeric reference to a NULL, surrogate, control, noncharacter, or out-of-Unicode-range code point.

> In certain cases described in other sections, text may be mixed with **character references**. These can be used to escape characters that couldn't otherwise legally be included in text.

Cite: [HTML Living Standard 13.1.4 Character references](https://html.spec.whatwg.org/multipage/syntax.html#syntax-charref:~:text=In%20certain%20cases%20described%20in%20other%20sections%2C%20text%20may%20be%20mixed%20with%20character%20references.%20These%20can%20be%20used%20to%20escape%20characters%20that%20couldn%27t%20otherwise%20legally%20be%20included%20in%20text.)

This rule reads the same parse5 tokenizer errors the built-in `parseError` channel can surface, and reports them under this rule's name instead so they're covered by the same enable/severity/reason config as every other rule.

A literal `<` or an ambiguous ampersand that was never written as a `&...;`-shaped sequence in the first place is [`no-unescaped-char`](/docs/rules/no-unescaped-char)'s concern, not this rule's.

❌ Examples of **incorrect** code for this rule

```html
<p>&xyz;</p>
<p>&amp text</p>
<p>&#;</p>
<p>&#x110000;</p>
```

✅ Examples of **correct** code for this rule

```html
<p>&amp; text</p>
<p>&#65;</p>
```
