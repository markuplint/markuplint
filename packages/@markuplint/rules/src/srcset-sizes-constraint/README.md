---
id: srcset-sizes-constraint
description: Enforces WHATWG constraints between srcset, sizes, loading, media, and type attributes.
---

# `srcset-sizes-constraint`

Enforces WHATWG constraints between the `srcset`, `sizes`, `loading`, `media`, and `type` attributes on `<img>` and `<source>` elements.

This rule checks the following constraints based on the [HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes):

| #   | Constraint                                                                                                                            | Target                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | When `sizes` is present, `srcset` must use **width descriptors** (`w`) only                                                           | `img`, `source`           |
| 2   | `srcset` must not mix **width** (`w`) and **pixel density** (`x`) descriptors                                                         | `img`, `source`           |
| 3   | `sizes="auto"` on `<img>` requires `loading="lazy"`                                                                                   | `img`                     |
| 4   | `sizes="auto"` on `<source>` requires the following sibling `<img>` to have `loading="lazy"`                                          | `source` (in `<picture>`) |
| 5a  | When `srcset` uses width descriptors, `sizes` is required                                                                             | `img`                     |
| 5b  | Same as 5a, unless the following sibling `<img>` has `loading="lazy"` (auto-sizes support)                                            | `source` (in `<picture>`) |
| 6   | A `<source>` with a following sibling `<source>` or `<img>` that has `srcset` must have a `media` (not `all`) and/or `type` attribute | `source` (in `<picture>`) |

## How It Works

- Only `<img>` and `<source>` elements inside `<picture>` are checked.
- Dynamic attribute values (e.g., Vue `:srcset`, JSX `srcset={...}`) and elements with spread attributes are skipped.
- A descriptor-less image candidate (e.g., `image.png` without `480w` or `2x`) is treated as an implied `1x` density descriptor.
- `sizes="auto"` is recognized when `auto` appears at the start of the attribute value (case-insensitive). For example, `sizes="auto, 100vw"` is treated as auto, but `sizes="100vw, auto"` is not.
- For Check 6, a `media` attribute counts as distinguishing the source only when its value, after stripping leading and trailing ASCII whitespace, is neither empty nor an ASCII case-insensitive match for `all`. A `type` attribute (any value) always counts. Dynamic `media`/`type` values are assumed to qualify and are skipped.

## Examples

❌ Examples of **incorrect** code for this rule

```html
<!-- Check 1: sizes + density descriptors -->
<img srcset="a.png 1x, b.png 2x" sizes="100vw" src="a.png" alt="photo" />

<!-- Check 2: mixing width and density descriptors -->
<img srcset="a.png 480w, b.png 2x" src="a.png" alt="photo" />

<!-- Check 3: sizes=auto without loading=lazy -->
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="photo" />

<!-- Check 4: source sizes=auto without lazy img -->
<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="photo" />
</picture>

<!-- Check 5a: img width descriptors without sizes -->
<img srcset="a.png 480w, b.png 1024w" src="b.png" alt="photo" />

<!-- Check 5b: source width descriptors, no sizes, sibling img NOT lazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" alt="photo" />
</picture>

<!-- Check 6: always-matching source (no media/type) before a srcset sibling -->
<picture>
  <source srcset="a.webp" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="photo" />
</picture>

<!-- Check 6: media="all" does not distinguish the source -->
<picture>
  <source srcset="a.webp" media="all" />
  <img src="b.jpg" srcset="b.jpg" alt="photo" />
</picture>
```

✅ Examples of **correct** code for this rule

```html
<!-- Width descriptors with sizes -->
<img srcset="a.png 480w, b.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="b.png" alt="photo" />

<!-- Density descriptors without sizes -->
<img srcset="a.png 1x, b.png 2x" src="a.png" alt="photo" />

<!-- sizes=auto with loading=lazy -->
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="photo" />

<!-- source sizes=auto with lazy img -->
<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="photo" />
</picture>

<!-- Check 5b escape: source width descriptors, no sizes, sibling img IS lazy -->
<picture>
  <source srcset="a.webp 480w, b.webp 1024w" />
  <img src="a.jpg" loading="lazy" alt="photo" />
</picture>

<!-- Check 6: source distinguished by a media query -->
<picture>
  <source srcset="a.webp" media="(min-width: 600px)" />
  <source srcset="b.jpg" />
  <img src="b.jpg" alt="photo" />
</picture>

<!-- Check 6: source distinguished by a type -->
<picture>
  <source srcset="a.webp" type="image/webp" />
  <img src="b.jpg" srcset="b.jpg" alt="photo" />
</picture>
```

## Note on overlap with `invalid-attr`

Check 2 (descriptor mixing) overlaps with the `Srcset` type validator used by the [`invalid-attr`](../invalid-attr/README.md) rule. When both rules are enabled, mixing width and density descriptors may be reported by both rules. This is intentional — `invalid-attr` validates the `srcset` attribute value syntax, while this rule checks inter-attribute constraints. If you want to avoid duplicate reports for descriptor mixing, you can rely on `invalid-attr` alone for that check.

## References

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
