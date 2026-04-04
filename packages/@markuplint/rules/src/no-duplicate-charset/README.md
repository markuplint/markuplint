---
id: no-duplicate-charset
description: Disallow more than one meta element with a charset attribute in a document.
---

# `no-duplicate-charset`

Disallow more than one `<meta>` element with a `charset` attribute in a document. Per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-charset), there must not be more than one `meta` element with a `charset` attribute per document.

❌ Examples of **incorrect** code for this rule

```html
<head>
  <meta charset="UTF-8" />
  <meta charset="UTF-8" />
</head>
```

✅ Examples of **correct** code for this rule

```html
<head>
  <meta charset="UTF-8" />
</head>
```
