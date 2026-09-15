---
id: no-unclosed-element-at-eof
description: Disallow an element requiring an end tag from remaining open at the end of the document.
---

# `no-unclosed-element-at-eof`

Per [HTML Living Standard §13.2.6.4.7 (the "in body" insertion mode, "An end-of-file token")](https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody), reaching the end of the file while an element other than `dd`, `dt`, `li`, `optgroup`, `option`, `p`, `rb`, `rp`, `rt`, `rtc`, `tbody`, `td`, `tfoot`, `th`, `thead`, `tr`, `body`, or `html` is still open is a parse error.

Every name in that exception list has its own optional-tag-omission rule elsewhere in the spec, so leaving one of them open at the end of the file is normal, well-formed markup. Anything else — `<picture>` is a common case, since it has no such omission rule — must have an explicit end tag.

❌ Examples of **incorrect** code for this rule

<!-- prettier-ignore -->
```html
<picture><img src="photo.jpg" alt="" />
```

✅ Examples of **correct** code for this rule

```html
<picture><img src="photo.jpg" alt="" /></picture>
```
