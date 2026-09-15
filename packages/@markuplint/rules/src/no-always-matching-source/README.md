---
id: no-always-matching-source
description: Requires a media or type attribute on a source element that has a following srcset-bearing sibling.
---

# `no-always-matching-source`

Requires a `<source>` element to have a usable `media` and/or `type` attribute when it has a following sibling `<source>` or `<img>` element with a `srcset` attribute, per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element). Without one, the `<source>` "always matches" and shadows the following candidates.

Split out of the former `srcset-sizes-constraint` rule, alongside [`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes), [`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors), and [`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading).

## How It Works

- Only `<source>` elements inside `<picture>` are checked. Elements with spread attributes are skipped.
- A `media` attribute counts as distinguishing the source only when its value, after stripping leading and trailing ASCII whitespace, is neither empty nor an ASCII case-insensitive match for `all`. A `type` attribute (any value) always counts. Dynamic `media`/`type` values are assumed to qualify and are skipped.
- Whether the current `<source>` itself has a `srcset` attribute does not matter — the requirement is about distinguishing it from a **following** sibling's candidates.

❌ Examples of **incorrect** code for this rule

```html
<!-- No media/type before a srcset-bearing sibling -->
<picture>
  <source srcset="a.webp" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="photo" />
</picture>

<!-- media="all" does not distinguish the source -->
<picture>
  <source srcset="a.webp" media="all" />
  <img src="b.jpg" srcset="b.jpg" alt="photo" />
</picture>
```

✅ Examples of **correct** code for this rule

```html
<!-- Distinguished by a media query -->
<picture>
  <source srcset="a.webp" media="(min-width: 600px)" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="photo" />
</picture>

<!-- Distinguished by a type -->
<picture>
  <source srcset="a.webp" type="image/webp" />
  <img src="b.jpg" srcset="b.jpg" alt="photo" />
</picture>
```

## References

- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
