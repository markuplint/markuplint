---
id: attr-duplication
description: Warns that attributes were duplicated in one element. Capital letters and lower-case letters are not distinguished.
category: validation
severity: error
---

# `attr-duplication`

Warns that **attributes** were duplicated in one element. Capital letters and lower-case letters are not distinguished.

> There must never be two or more attributes on the same start tag whose names are an ASCII case-insensitive match for each other.

Cite: [HTML Living Standard 13.1.2.3 Attributes](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2:~:text=There%20must%20never%20be%20two%20or%20more%20attributes%20on%20the%20same%20start%20tag%20whose%20names%20are%20an%20ASCII%20case%2Dinsensitive%20match%20for%20each%20other.)

❌ Examples of **incorrect** code for this rule

```html
<div data-attr="value" data-Attr="db"></div>
```

✅ Examples of **correct** code for this rule

```html
<div data-attr="value" data-Attr2="db"></div>
```
