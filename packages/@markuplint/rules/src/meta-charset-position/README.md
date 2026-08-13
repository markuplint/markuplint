---
id: meta-charset-position
description: Require the character encoding declaration to be serialized within the first 1024 bytes of the document.
---

# `meta-charset-position`

Per [HTML Living Standard §4.2.5.4 (Specifying the document's character encoding)](https://html.spec.whatwg.org/multipage/semantics.html#charset), the element containing the character encoding declaration — a `meta` element with a `charset` attribute, or a `meta` element with an `http-equiv` attribute in the Encoding declaration state — must be serialized completely within the first 1024 bytes of the document.

The limit is a byte count, not a character count: content before the declaration is measured as UTF-8-encoded bytes, so multi-byte characters count at their actual encoded size, not one per character.

❌ Examples of **incorrect** code for this rule

```html
<!doctype html>
<!-- a comment or other content padding the document past 1024 bytes -->
<meta charset="utf-8" />
```

✅ Examples of **correct** code for this rule

```html
<!doctype html> <meta charset="utf-8" />
```
