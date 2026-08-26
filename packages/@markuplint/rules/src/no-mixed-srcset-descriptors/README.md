---
id: no-mixed-srcset-descriptors
description: Disallows mixing width and pixel density descriptors in a srcset attribute.
---

# `no-mixed-srcset-descriptors`

Disallows mixing **width** (`w`) and **pixel density** (`x`) descriptors within a single `srcset` attribute on `<img>` and `<source>` elements, per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes).

Split out of the former `srcset-sizes-constraint` rule, alongside [`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes), [`sizes-auto-requires-lazy-loading`](/docs/rules/sizes-auto-requires-lazy-loading), and [`no-always-matching-source`](/docs/rules/no-always-matching-source).

## How It Works

- Only `<img>` and `<source>` elements inside `<picture>` are checked.
- Dynamic attribute values (e.g., Vue `:srcset`, JSX `srcset={...}`) and elements with spread attributes are skipped.
- A descriptor-less image candidate (e.g., `image.png` without `480w` or `2x`) is treated as an implied `1x` density descriptor.

❌ Examples of **incorrect** code for this rule

```html
<img srcset="a.png 480w, b.png 2x" src="a.png" alt="photo" />
```

✅ Examples of **correct** code for this rule

```html
<!-- All width descriptors -->
<img srcset="a.png 480w, b.png 1024w" sizes="100vw" src="b.png" alt="photo" />

<!-- All pixel density descriptors -->
<img srcset="a.png 1x, b.png 2x" src="a.png" alt="photo" />
```

## Note on overlap with `no-invalid-attr-value`

This rule overlaps with the `Srcset` type validator used by the [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) rule. When both rules are enabled, mixing width and density descriptors may be reported by both rules. This is intentional — `no-invalid-attr-value` validates the `srcset` attribute value syntax, while this rule checks the inter-descriptor constraint. If you want to avoid duplicate reports, you can rely on `no-invalid-attr-value` alone for this check.

## References

- [HTML Living Standard - Srcset attributes](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
