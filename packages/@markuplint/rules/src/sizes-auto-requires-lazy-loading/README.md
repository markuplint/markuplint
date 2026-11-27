---
id: sizes-auto-requires-lazy-loading
description: Requires loading="lazy" wherever sizes="auto" is used, the literal form of auto on the img, and sizes="auto" on the img that a source relies on.
---

# `sizes-auto-requires-lazy-loading`

Requires `loading="lazy"` wherever `sizes="auto"` is used on `<img>` and `<source>` elements, per the [HTML Living Standard](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element). A `<source>` also needs the following sibling `<img>` to have `sizes="auto"`, because only such an `<img>` allows auto-sizes. Whether an `<img>` allows auto-sizes depends on the literal value of its `sizes`, so an `<img>` whose `sizes` specifies `auto` must have a value that is exactly `auto` or starts with `auto,`, with no whitespace or comments before or directly after `auto` ([sizes attributes](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)).

> An img element allows auto-sizes if: its loading attribute is in the Lazy state, and its sizes attribute's value is "auto" (ASCII case-insensitive), or starts with "auto," (ASCII case-insensitive).

Cite: [HTML Living Standard: An img element allows auto-sizes](https://html.spec.whatwg.org/multipage/embedded-content.html#allows-auto-sizes)

Split out of the former `srcset-sizes-constraint` rule, alongside [`no-unpaired-srcset-sizes`](/docs/rules/no-unpaired-srcset-sizes), [`no-mixed-srcset-descriptors`](/docs/rules/no-mixed-srcset-descriptors), and [`no-always-matching-source`](/docs/rules/no-always-matching-source).

| #   | Constraint                                                                                                      | Target                    |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | `sizes="auto"` on `<img>` requires `loading="lazy"`                                                             | `img`                     |
| 2   | `sizes="auto"` on `<source>` requires the following sibling `<img>` to have `loading="lazy"` and `sizes="auto"` | `source` (in `<picture>`) |
| 3   | `sizes` on `<img>` that specifies `auto` must be exactly `auto` or start with `auto,`                           | `img`                     |

## How It Works

- Only `<img>` and `<source>` elements inside `<picture>` are checked, and only when the element has a `srcset` attribute. On an `<img>` without `srcset`, `sizes` is allowed only as the value `auto` with `loading="lazy"`: [`no-disallowed-attr`](/docs/rules/no-disallowed-attr) reports a `sizes` without `loading="lazy"`, and [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) reports a value other than `auto`. A dynamic `sizes` is still reported by `no-disallowed-attr` when the image has no `loading` attribute or a `loading` other than `lazy`; when `loading` is dynamic, whether the image is lazily loaded is not judged.
- Dynamic attribute values (e.g., Vue `:sizes="x"`, JSX `sizes={x}`) and elements with spread attributes (`{...props}` of JSX, `v-bind="obj"` of Vue) are skipped. A literal written as code (`sizes={"auto"}`) is evaluated as the value that the framework renders it to; a literal that the framework does not output (`null`, `false`) or renders in a way that is not known is skipped, as a dynamic value is.
- `auto` is recognized as the first entry of the list, as the grammar of the value reads it (case-insensitive, with whitespace and comments around it allowed). For example, `sizes="auto, 100vw"` and `sizes=" auto , 100vw"` specify `auto`, but `sizes="auto 100vw"` does not; `auto` after the first entry (`sizes="100vw, auto"`) is a syntax error that [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) reports.
- On a `<source>`, whitespace and comments around `auto` are allowed. On an `<img>`, they are not (constraint 3), and the following sibling `<img>` that a `<source>` relies on allows auto-sizes only when its `sizes` is exactly `auto` or starts with `auto,`.

❌ Examples of **incorrect** code for this rule

```html
<img srcset="a.png 480w" sizes="auto" src="a.png" alt="photo" />

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" alt="photo" />
</picture>

<picture>
  <source srcset="a.webp 480w" sizes="auto" />
  <img src="a.jpg" loading="lazy" alt="photo" />
</picture>

<img srcset="a.png 480w" sizes=" auto , 100vw" loading="lazy" src="a.png" alt="photo" />
```

✅ Examples of **correct** code for this rule

```html
<img srcset="a.png 480w" sizes="auto" loading="lazy" src="a.png" alt="photo" />

<picture>
  <source srcset="a.webp 480w" sizes=" auto , 100vw" />
  <img src="a.jpg" loading="lazy" sizes="auto" alt="photo" />
</picture>
```

## References

- [HTML Living Standard - The img element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [HTML Living Standard - The source element](https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element)
- [HTML Living Standard - An img element allows auto-sizes](https://html.spec.whatwg.org/multipage/embedded-content.html#allows-auto-sizes)
- [HTML Living Standard - Sizes attributes](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)
