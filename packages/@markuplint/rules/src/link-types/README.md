---
id: link-types
description: Validates link type keywords in the `rel` attribute against the WHATWG standard.
---

# `link-types`

Validates link type keywords in the `rel` attribute on `<link>`, `<a>`, `<area>`, and `<form>` elements against the [WHATWG standard](https://html.spec.whatwg.org/multipage/links.html#linkTypes).

This rule checks:

- Whether the keyword is allowed on the specific element (e.g., `bookmark` is allowed on `<a>` but not on `<link>`)
- Whether a `<link>` element inside `<body>` uses only [body-ok](https://html.spec.whatwg.org/multipage/links.html#body-ok) keywords
- Whether the keyword is a [dropped, rejected, or non-HTML](https://microformats.org/wiki/existing-rel-values) keyword from the Microformats registry

:::note

The `no-invalid-attr-value` rule also validates `rel` attribute values via the type system, but it does not check body-ok context and always permits Microformats keywords. The `link-types` rule provides body-ok checking and Microformats control with more detailed error messages. Both rules can be used together; their checks are complementary.

:::

❌ Examples of **incorrect** code for this rule

```html
<!-- "bookmark" is not allowed on <link> -->
<link rel="bookmark" />

<!-- "canonical" is not body-ok, so it's not allowed inside <body> -->
<html>
  <head></head>
  <body>
    <link rel="canonical" href="https://example.com/" />
  </body>
</html>

<!-- "stylesheet" is not allowed on <a> -->
<a rel="stylesheet" href="/style.css">link</a>
```

✅ Examples of **correct** code for this rule

```html
<link rel="stylesheet" href="/style.css" />
<link rel="canonical" href="https://example.com/" />
<a rel="noopener noreferrer" href="https://example.com/">link</a>
<form rel="nofollow" action="/submit"></form>
```

---

## Configuration Example

### `allowMicroformats`

type: `boolean | string[]`
default: `true`

Controls whether [Microformats](https://microformats.org/wiki/existing-rel-values) link type keywords are allowed, in addition to the WHATWG standard keywords. The Microformats keyword list is based on the [microformats.org wiki](https://microformats.org/wiki/existing-rel-values) registered keywords.

The default is `true`: [HTML Living Standard §4.6.6 the rel attribute](https://html.spec.whatwg.org/multipage/links.html#linkTypes) requires conformance checkers to accept keywords registered on the microformats wiki (proposed or ratified) as extensions to the spec, so rejecting them would itself be non-conformant.

Even when Microformats keywords are allowed, element context is still enforced. For example, keywords defined only for `<a>` are rejected on `<link>`. Microformats keywords are always rejected on `<form>` because the Microformats registry does not define form context.

#### `false` — WHATWG standard keywords only

```json class=config
{
  "rules": {
    "link-types": {
      "options": {
        "allowMicroformats": false
      }
    }
  }
}
```

#### `string[]` — Allow only specified keywords

Allows only the specified keywords. You can also specify custom keywords that are not in any registry.

```json class=config
{
  "rules": {
    "link-types": {
      "options": {
        "allowMicroformats": ["apple-touch-icon", "mask-icon"]
      }
    }
  }
}
```
