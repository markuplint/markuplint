# Using Presets

Presets are curated sets of rules that you can apply with a single line of configuration. Instead of enabling rules one by one, specify a preset in the `extends` property:

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

## Which preset should I use?

Choose based on your project type:

| Project type               | Recommended preset                   |
| -------------------------- | ------------------------------------ |
| Static HTML (no framework) | `markuplint:recommended-static-html` |
| React / Next.js / Preact   | `markuplint:recommended-react`       |
| Vue / Nuxt                 | `markuplint:recommended-vue`         |
| Svelte / SvelteKit         | `markuplint:recommended-svelte`      |
| Other / General purpose    | `markuplint:recommended`             |

All recommended presets include the same **base presets** (`a11y`, `html-standard`, `performance`, `rdfa`, `security`), plus framework-specific rules where applicable.

## Applying presets

### Recommended presets

- `markuplint:recommended`
- `markuplint:recommended-static-html`
- `markuplint:recommended-react`
- `markuplint:recommended-vue`
- `markuplint:recommended-svelte`

These **recommended presets** include **all [base presets](#base-presets)** and each has framework-specific rulesets (e.g., [`markuplint:recommended-static-html`](#preset-static-html), [`markuplint:recommended-react`](#preset-react)) except `markuplint:recommended`.

### Base presets {#base-presets}

You can also pick individual base presets if you want fine-grained control:

- `markuplint:a11y`
- `markuplint:html-standard`
- `markuplint:performance`
- `markuplint:rdfa`
- `markuplint:security`

```json class=config
{
  "extends": ["markuplint:html-standard", "markuplint:a11y"]
}
```

See [rulesets](#rulesets-of-base-presets) below for what each preset includes.

## Named rules in presets {#named-rules}

Some checks in presets are defined as **named rules**. Named rules have a name in the `namespace/rule-name` format, which appears in violation reports (e.g., `a11y/html-lang`).

You can use the `rules` property to disable, change severity, or bulk-disable named rules by namespace wildcard:

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // Disable a specific named rule
    "a11y/html-lang": false,

    // Change severity of a named rule
    "a11y/no-autofocus-outside-dialog": { "severity": "warning" },

    // Disable all named rules in a namespace
    "a11y/*": false
  }
}
```

When multiple presets wrap the same base rule (e.g., `a11y/id-duplication` and `html-standard/id-duplication`), both run independently and report separate violations. You can control each one individually.

See the [rulesets tables](#rulesets-of-base-presets) below for the full list of named rules.

## Preset rulesets {#rulesets-of-base-presets}

### `markuplint:a11y` {#preset-a11y}

| Named Rule                                 | Description                                                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y/id-duplication`                      | Warns when `id` attribute values are duplicated in one document. Avoids problems in assistive technologies from the viewpoint of machine readability. |
| `a11y/no-refer-to-non-existent-id`         | Checks whether IDs specified in `for`, `form`, `aria-*`, and more reference an ID that exists in the same document.                                   |
| `a11y/no-broken-fragment-link`             | Checks whether a fragment in a hyperlink references an ID that exists in the same document.                                                           |
| `a11y/wai-aria`                            | Warns if `role` and `aria-*` attributes don't conform to WAI-ARIA, DPub-ARIA, and ARIA in HTML specifications.                                        |
| `a11y/require-accessible-name`             | Warns if the element has no accessible name according to its ARIA role.                                                                               |
| `a11y/redundant-accessible-name`           | Detects elements with multiple accessible name sources where a higher-priority source overrides a lower-priority one.                                 |
| `a11y/label-has-control`                   | Warns if the `<label>` element has no associated control.                                                                                             |
| `a11y/landmark-roles`                      | Checks that `banner`, `main`, and `contentinfo` are top-level landmarks.                                                                              |
| `a11y/require-landmark-label`              | Checks that landmarks with a duplicated role have unique accessible names.                                                                            |
| `a11y/required-h1`                         | Warns if there is no `<h1>` element in the document.                                                                                                  |
| `a11y/html-lang`                           | Requires the `lang` attribute on the `<html>` element for assistive technologies to identify the document language.                                   |
| `a11y/abbr-title`                          | Requires the `title` attribute on `<abbr>` elements to provide the full expansion of abbreviations.                                                   |
| `a11y/media-track`                         | Requires `<track>` elements in `<audio>` and `<video>` for captions and descriptions.                                                                 |
| `a11y/video-autoplay-muted`                | Requires `<video>` elements with `autoplay` to also have the `muted` attribute to prevent unexpected audio.                                           |
| `a11y/no-accesskey`                        | Disallows the `accesskey` attribute as it can cause accessibility issues due to conflicts with assistive technology shortcuts.                        |
| `a11y/tabindex-restrict`                   | Restricts the `tabindex` attribute to only `-1` or `0` values to prevent disrupting natural tab order.                                                |
| `a11y/no-autofocus-outside-dialog`         | Don't take away focus forcibly. However, the `dialog` element and its descendants allow it.                                                           |
| `a11y/viewport-no-user-scalable`           | Disallows `user-scalable=no` in viewport meta tag as it prevents zooming for users with low vision.                                                   |
| `a11y/no-consecutive-br`                   | Warns against the use of consecutive `<br>` tags. Use CSS margins or appropriate block elements instead.                                              |
| `a11y/no-ambiguous-navigable-target-names` | Prevents typographical errors in links that could replace special navigational keywords like `_blank` with invalid target names.                      |
| `a11y/use-list`                            | Prompts to use a list element when a bullet character appears at the start of a text node.                                                            |
| `a11y/table-row-column-alignment`          | Ensures consistency in the defined number of rows and columns, accounting for `colspan` and `rowspan`.                                                |
| `a11y/no-table-cell-overlap`               | Disallows `rowspan` / `colspan` values that cause two cells to cover the same slot.                                                                   |
| `a11y/no-table-span-overflow`              | Disallows a `rowspan` that reaches past the end of its `<thead>`, `<tbody>`, or `<tfoot>`.                                                            |
| `a11y/no-empty-table-track`                | Disallows a table row or column that no cell is anchored to.                                                                                          |
| `a11y/no-merge-cells`                      | Disallows `colspan` and `rowspan` attributes on table cells to prevent merged cells that are difficult for assistive technologies.                    |
| `a11y/neighbor-popovers`                   | Warns when popover triggers and their corresponding targets are not adjacent in the DOM.                                                              |
| `a11y/summary-no-interactive`              | There is a case where an assistive technology can't access contents, or contents don't propagate a mouse event to `<summary>`.                        |
| `a11y/require-dialog-autofocus`            | Requires a dialog shown via the `showModal()` method to contain an element with the `autofocus` attribute.                                            |

### `markuplint:html-standard` {#preset-html-standard}

Also enables the base rules [`no-unknown-attr`](/docs/rules/no-unknown-attr), [`no-disallowed-attr`](/docs/rules/no-disallowed-attr), and [`no-invalid-attr-value`](/docs/rules/no-invalid-attr-value) for spec-based attribute validation. Named rules that restrict specific attributes (such as `a11y/no-accesskey`) wrap [`no-restricted-attr`](/docs/rules/no-restricted-attr) instead — that rule only enforces its own configured denylist and never performs spec validation, so it stays narrow no matter where it's used.

| Named Rule                                       | Description                                                                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html-standard/id-duplication`                   | Warns when `id` attribute values are duplicated in one document.                                                                                    |
| `html-standard/no-refer-to-non-existent-id`      | Checks whether IDs specified in `for`, `form`, `aria-*`, and more reference an ID that exists in the same document.                                 |
| `html-standard/attr-duplication`                 | The parser ignores all such duplicate occurrences of the attribute.                                                                                 |
| `html-standard/deprecated-attr`                  | Authors must not use attributes the HTML spec has removed entirely (obsolete, non-conforming features).                                             |
| `html-standard/no-deprecated-attr`               | Warns on attributes MDN/BCD marks as deprecated (still defined by the spec, but discouraged).                                                       |
| `html-standard/deprecated-element`               | Authors must not use elements the HTML spec has removed entirely (obsolete, non-conforming features).                                               |
| `html-standard/no-deprecated-element`            | Warns on elements MDN/BCD marks as deprecated (still defined by the spec, but discouraged).                                                         |
| `html-standard/doctype`                          | It has the effect of avoiding quirks mode.                                                                                                          |
| `html-standard/no-obsolete-doctype`              | Authors must not use an obsolete DOCTYPE (a public identifier, or a system identifier other than the one legacy-string exception the spec permits). |
| `html-standard/permitted-contents`               | Warns if a child element is not allowed by the HTML specification for its parent element.                                                           |
| `html-standard/no-disallowed-ancestor`           | Warns if an element appears as a descendant of an ancestor its content model forbids (e.g. `<address>` inside `<address>`).                         |
| `html-standard/require-ancestor`                 | Warns if an element appears outside a required ancestor (e.g. `<area>` outside `<map>`).                                                            |
| `html-standard/no-duplicate-sibling-attr`        | Warns if an attribute the content model marks as sibling-unique appears on more than one element of the same type within the same parent.           |
| `html-standard/required-attr`                    | Warns if required attributes defined by the HTML specification are not present on an element.                                                       |
| `html-standard/ineffective-attr`                 | Warns when a specified attribute has no effect on the element (e.g., `disabled` on a `<div>`).                                                      |
| `html-standard/no-orphaned-end-tag`              | Warns when an end tag appears without a corresponding start tag, which constitutes an inner parse error.                                            |
| `html-standard/heading-levels`                   | Each heading must be equal to or one level greater than the previous heading.                                                                       |
| `html-standard/no-duplicate-dt`                  | Within a single `<dl>` element, there should not be more than one `<dt>` element for each name.                                                     |
| `html-standard/placeholder-label-option`         | Checks whether the `<select>` element needs the placeholder label option (first `<option>` with an empty value).                                    |
| `html-standard/require-datetime`                 | Warns that the `datetime` attribute is needed if the `<time>` element has content that is not a valid date/time string.                             |
| `html-standard/srcset-sizes-constraint`          | Requires `sizes` wherever `srcset` uses width descriptors, and vice versa.                                                                          |
| `html-standard/no-mixed-srcset-descriptors`      | Disallows mixing width and pixel density descriptors in a `srcset` attribute.                                                                       |
| `html-standard/sizes-auto-requires-lazy-loading` | Requires `loading="lazy"` wherever `sizes="auto"` is used.                                                                                          |
| `html-standard/no-always-matching-source`        | Requires a distinguishing `media` or `type` on a `<source>` with a following srcset-bearing sibling.                                                |
| `html-standard/head-charset-utf8`                | Requires a `<meta charset="UTF-8">` element in the document head.                                                                                   |
| `html-standard/no-small-in-heading`              | Should not use `<small>` in `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, and `<h6>`.                                                                     |
| `html-standard/figure-no-caption`                | When `<table>` is the only content in `<figure>` other than `<figcaption>`, `<caption>` should be omitted in favor of `<figcaption>`.               |
| `html-standard/input-pattern-title`              | When an `<input>` element has a `pattern` attribute specified, authors should include a `title` attribute to give a description of the pattern.     |
| `html-standard/no-nested-details-name`           | A document must not contain a `<details>` element that is a descendant of another `<details>` element in the same name group.                       |
| `html-standard/no-shortcut-icon`                 | The `shortcut` keyword in `<link rel>` is unnecessary. Use `rel="icon"` instead.                                                                    |

### `markuplint:performance` {#preset-performance}

| Named Rule                        | Description                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `performance/head-charset-utf8`   | Requires a `<meta charset="UTF-8">` element in the document head.                                       |
| `performance/script-defer`        | Should load and parse scripts lazily to avoid render-blocking.                                          |
| `performance/img-aspect-ratio`    | Requires `width` and `height` attributes on `<img>` to avoid **Cumulative Layout Shift**.               |
| `performance/iframe-lazy-loading` | Requires `loading=lazy` on `<iframe>` to avoid render-blocking when the element is out of the viewport. |

### `markuplint:rdfa` {#preset-rdfa}

Extends `no-unknown-attr`, `no-disallowed-attr`, and `no-invalid-attr-value` to allow the `property` and `content` attributes on `<meta property>` so that RDFa-based metadata (e.g., **Open Graph**) does not trigger spec-validation violations. Also disables `require-attr` on the same elements.

No named rules are exposed by this preset.

### `markuplint:recommended-static-html` {#preset-static-html}

Includes all [base presets](#base-presets) plus the following rules:

| Named Rule                                     | Description                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `static-html/character-reference`              | Warns when a literal `<` in a text node or attribute value isn't escaped with a character reference.                            |
| `static-html/no-malformed-character-reference` | Warns when a `&...;`-shaped character reference is malformed (unknown name, missing semicolon, invalid numeric reference).      |
| `static-html/end-tag`                          | Recommends always writing end tags because it is too difficult for a human to decide whether an element's end tag is omittable. |

### `markuplint:recommended-react` {#preset-react}

Includes all [base presets](#base-presets) plus the following rules:

| Named Rule              | Description                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `react/no-hard-code-id` | Components with hard-coded IDs cannot be mounted multiple times because IDs must be unique in a document. Use dynamic IDs instead. |

### `markuplint:recommended-vue` {#preset-vue}

Includes all [base presets](#base-presets) plus the following rules:

| Named Rule            | Description                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `vue/no-hard-code-id` | Components with hard-coded IDs cannot be mounted multiple times because IDs must be unique in a document. Use dynamic IDs instead. |

### `markuplint:recommended-svelte` {#preset-svelte}

Includes all [base presets](#base-presets) plus the following rules:

| Named Rule               | Description                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `svelte/no-hard-code-id` | Components with hard-coded IDs cannot be mounted multiple times because IDs must be unique in a document. Use dynamic IDs instead. |

## Next steps

- **[Applying Rules](/docs/guides/applying-rules)** — Customize preset rules or add individual rules
- **[Beyond HTML](/docs/guides/beyond-html)** — Set up parsers for JSX, Vue, Svelte, and more
- **[Configuration](/docs/configuration)** — Learn about configuration file formats and properties
