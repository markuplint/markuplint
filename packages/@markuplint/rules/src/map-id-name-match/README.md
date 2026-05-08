---
id: map-id-name-match
description: Require that, when both attributes are present on a map element, the id attribute has the same value as the name attribute.
---

# `map-id-name-match`

Per [HTML Living Standard §4.8.13 (the map element)](https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element), when a `<map>` element has both an `id` and a `name` attribute, the two attributes must have the same value.

The comparison is **case-sensitive**. The spec text "same value" is taken as strict string equality; `<map id="Foo" name="foo">` is therefore reported. Note that the map's `name` attribute itself is matched case-insensitively against `<img usemap>` per the parsing rules, but that is a separate concern from this conformance assertion.

❌ Examples of **incorrect** code for this rule

```html
<map id="foo" name="bar"><area href="a.html" alt="A" /></map>
```

✅ Examples of **correct** code for this rule

```html
<map id="foo" name="foo"><area href="a.html" alt="A" /></map> <map name="foo"><area href="a.html" alt="A" /></map>
```
