---
id: no-unescaped-char
description: "Warns when a literal less-than sign (or, in strict mode, a greater-than sign, a double quote, or a bare ampersand) isn't escaped with a character reference in text content or an attribute value."
---

# `no-unescaped-char`

Warns when a literal `<` appears unescaped in a text node or attribute value. [HTML Living Standard §13.1.2.3–4](https://html.spec.whatwg.org/multipage/syntax.html#syntax-charref) requires authors to escape a literal `<` and an "ambiguous ampersand" — everything else (`>`, `"`, and a bare `&` that isn't shaped like a reference attempt) is conforming as-is.

A `&name;`-shaped sequence with an unrecognized name is [`no-malformed-character-reference`](/docs/rules/no-malformed-character-reference)'s concern, not this rule's — it mirrors parse5's own detection of that case.

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore-start -->
```html
<div id="a"> < </div>
```
<!-- prettier-ignore-end -->

✅ Examples of **correct** code for this rule

<!-- prettier-ignore-start -->
```html
<div id="a"> &lt; </div>
<div id="a"> > & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->

---

## Details

### Setting `strict` option {#setting-strict-option}

When `true`, also flags `>`, `"`, and every bare `&` (an entity-shaped sequence like `&amp;` is still exempt either way). Off by default.

```json
{
  "no-unescaped-char": {
    "options": {
      "strict": true
    }
  }
}
```

❌ Examples of **incorrect** code with `strict: true`

<!-- prettier-ignore-start -->
```html
<div id="a"> > < & " </div>
<img src="path/to?a=b&c=d">
```
<!-- prettier-ignore-end -->
