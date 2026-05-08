---
id: map-id-name-match
description: Require that, when both attributes are present on a map element, the id attribute has the same value as the name attribute.
---

# `map-id-name-match`

Per [HTML Living Standard §4.8.13 (the map element)](https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element), when a `<map>` element has both an `id` and a `name` attribute, the two attributes must have the same value.

❌ Examples of **incorrect** code for this rule

```html
<map id="foo" name="bar"><area href="a.html" alt="A" /></map>
```

✅ Examples of **correct** code for this rule

```html
<map id="foo" name="foo"><area href="a.html" alt="A" /></map> <map name="foo"><area href="a.html" alt="A" /></map>
```
