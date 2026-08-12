---
id: usemap-references-map
description: Require that an img element's `usemap` attribute is a valid hash-name reference to a map element.
---

# `usemap-references-map`

Per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/image-maps.html#attr-hyperlink-usemap), the `usemap` attribute on an `<img>` element "must be a valid [hash-name reference](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-hash-name-reference) to a `map` element" — a `#` followed by a string that exactly matches the `name` attribute of a `<map>` element in the same tree.

Matching is by `name`, not `id`, so [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) — which only tracks `id` references — never catches a missing or misspelled `usemap` target. This rule fills that gap.

❌ Examples of **incorrect** code for this rule

```html
<img src="shapes.png" alt="" usemap="#nonexistent" />
```

✅ Examples of **correct** code for this rule

```html
<img src="shapes.png" alt="" usemap="#shapes" />
<map name="shapes">
  <area shape="rect" coords="25,25,125,125" href="red.html" alt="Red box." />
</map>
```
