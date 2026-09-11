---
id: sizes-auto-requires-lazy-loading
description: Requires loading="lazy" wherever sizes="auto" is used.
---

# `sizes-auto-requires-lazy-loading`

Requires `loading="lazy"` wherever `sizes="auto"` is used on `<img>` and `<source>` elements, per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element).

Split out of the former `srcset-sizes-constraint` rule, alongside [`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes), [`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors), and [`no-always-matching-source`](/docs/rules/no-always-matching-source).

| #   | Constraint                                                                                   | Target                    |
| --- | -------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | `sizes="auto"` on `<img>` requires `loading="lazy"`                                          | `img`                     |
| 2   | `sizes="auto"` on `<source>` requires the following sibling `<img>` to have `loading="lazy"` | `source` (in `<picture>`) |

## How It Works

- Only `<img>` and `<source>` elements inside `<picture>` are checked, and only when the element has a `srcset` attribute.
- Dynamic attribute values (e.g., Vue `:sizes`, JSX `sizes={...}`) and elements with spread attributes are skipped.
- `sizes="auto"` is recognized when `auto` appears at the start of the attribute value (case-insensitive). For example, `sizes="auto, 100vw"` is treated as auto, but `sizes="100vw, auto"` is not.

❌ Examples of **incorrect** code for this rule

```html
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="photo" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="photo" />
</picture>
```

✅ Examples of **correct** code for this rule

```html
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="photo" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="photo" />
</picture>
```

## References

- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
