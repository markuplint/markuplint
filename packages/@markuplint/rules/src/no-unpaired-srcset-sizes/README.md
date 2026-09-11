---
id: no-unpaired-srcset-sizes
description: Enforces the mutual requirement between the srcset width descriptors and the sizes attribute.
---

# `no-unpaired-srcset-sizes`

Enforces the mutual requirement between `srcset` width descriptors and the `sizes` attribute on `<img>` and `<source>` elements, per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes).

Split out of the former `srcset-sizes-constraint` rule, alongside [`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors), [`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading), and [`no-always-matching-source`](/docs/rules/no-always-matching-source).

| #   | Constraint                                                                                | Target                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | When `sizes` is present, `srcset` must use **width descriptors** (`w`) only               | `img`, `source`           |
| 2   | When `srcset` uses width descriptors, `sizes` is required                                 | `img`                     |
| 3   | Same as 2, unless the following sibling `<img>` has `loading="lazy"` (auto-sizes support) | `source` (in `<picture>`) |

## How It Works

- Only `<img>` and `<source>` elements inside `<picture>` are checked.
- Dynamic attribute values (e.g., Vue `:srcset`, JSX `srcset={...}`) and elements with spread attributes are skipped.
- A descriptor-less image candidate (e.g., `image.png` without `480w` or `2x`) does not count as a width descriptor.

❌ Examples of **incorrect** code for this rule

```html
<!-- sizes + density descriptors -->
<img srcset="a.png 1x, b.png 2x" sizes="100vw" src="a.png" alt="photo" />

<!-- width descriptors without sizes -->
<img srcset="a.png 480w, b.png 1024w" src="b.png" alt="photo" />

<!-- source width descriptors, no sizes, sibling img NOT lazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" alt="photo" />
</picture>
```

✅ Examples of **correct** code for this rule

```html
<!-- Width descriptors with sizes -->
<img srcset="a.png 480w, b.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="b.png" alt="photo" />

<!-- Density descriptors without sizes -->
<img srcset="a.png 1x, b.png 2x" src="a.png" alt="photo" />

<!-- source width descriptors, no sizes, sibling img IS lazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" loading="lazy" alt="photo" />
</picture>
```

## References

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
