# `no-redundant-accessible-name`

Detects elements with **multiple accessible name sources** where a higher-priority source overrides a lower-priority one according to the [Accessible Name and Description Computation (AccName) 1.2](https://www.w3.org/TR/accname-1.2/) algorithm.

When multiple naming mechanisms are present on a single element, only the highest-priority source is used. The overridden sources are dead code that may mislead developers into thinking they provide the element's accessible name.

For example, if a `<label>` says "Name" but an `aria-labelledby` attribute references a different element, sighted users see "Name" while screen reader users hear something else — a discrepancy that violates [WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html) and creates a confusing experience for assistive technology users.

> [!WARNING]
> Default severity is `warning`.

## Priority Order

The AccName 1.2 algorithm resolves the accessible name in this priority order:

| Priority | Source            | AccName Step                                                      | Example                            |
| -------- | ----------------- | ----------------------------------------------------------------- | ---------------------------------- |
| 1        | `aria-labelledby` | [2B](https://www.w3.org/TR/accname-1.2/#comp_labelledby)          | `<input aria-labelledby="ref">`    |
| 2        | `aria-label`      | [2C](https://www.w3.org/TR/accname-1.2/#comp_aria_label)          | `<input aria-label="Name">`        |
| 3        | `<label>`         | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<label for="x">Name</label>`      |
| 4        | `alt`             | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<img alt="Photo">`                |
| 5        | Text content      | [2F](https://www.w3.org/TR/accname-1.2/#comp_name_from_content)   | `<button>Click</button>`           |
| 6        | `value`           | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<input type="submit" value="Go">` |
| 7        | `<legend>`        | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<fieldset><legend>Group</legend>` |
| 8        | `<caption>`       | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<table><caption>Title</caption>`  |
| 9\*      | `title`           | [2I](https://www.w3.org/TR/accname-1.2/#comp_tooltip)             | `<input title="Hint">`             |
| 10\*     | `placeholder`     | [2I](https://www.w3.org/TR/accname-1.2/#comp_tooltip)             | `<input placeholder="Hint">`       |

\* Only checked when the corresponding option is enabled.

> **Note:** This table reflects the detection priority used by this rule. Sources at the same AccName step (e.g., `label`, `alt`, `legend`, and `caption` are all Step 2D) are ordered by their typical applicability scope, not by strict algorithm precedence.

## Rule Details

### :x: Incorrect

```html
<!-- aria-labelledby overrides label -->
<label for="name">Your name</label>
<span id="other-label">Different name</span>
<input id="name" type="text" aria-labelledby="other-label" />

<!-- aria-label overrides button text content -->
<button aria-label="Close dialog"><img src="x.svg" alt="" /> Close</button>

<!-- aria-label overrides alt -->
<img alt="Photo of sunset" aria-label="Decorative image" />

<!-- aria-label overrides legend -->
<fieldset aria-label="Overridden">
  <legend>Contact Information</legend>
</fieldset>
```

### :o: Correct

```html
<!-- Single source: label only -->
<label for="name">Your name</label>
<input id="name" type="text" />

<!-- Single source: content only -->
<button>Submit</button>

<!-- Single source: alt only -->
<img alt="Photo of sunset" />

<!-- Single source: aria-label only (no other source) -->
<input type="text" aria-label="Search" />
```

## WCAG 2.5.3: Label in Name

When `aria-label` provides a different string from the visible text, it can violate [WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html). This success criterion requires that the accessible name includes the visible label text. A redundant override with a mismatched string breaks this requirement.

This rule helps catch such mismatches by flagging the override itself.

## Options

### `checkTitleFallback`

Type: `boolean`
Default: `false`

When `true`, the `title` attribute is included in the redundancy check. By default, `title` is ignored because it is a last-resort fallback in the AccName algorithm.

```json
{
  "no-redundant-accessible-name": {
    "options": {
      "checkTitleFallback": true
    }
  }
}
```

### `checkPlaceholderFallback`

Type: `boolean`
Default: `false`

When `true`, the `placeholder` attribute is included in the redundancy check. By default, `placeholder` is ignored because it is a last-resort fallback.

```json
{
  "no-redundant-accessible-name": {
    "options": {
      "checkPlaceholderFallback": true
    }
  }
}
```

## Excluding Specific Elements

For legitimate patterns such as icon buttons where `aria-label` intentionally provides the name:

```json
{
  "nodeRules": [
    {
      "selector": "button:has(svg)",
      "rules": {
        "no-redundant-accessible-name": false
      }
    }
  ]
}
```

### Intentional Override with `aria-labelledby`

A common legitimate pattern is using `aria-labelledby` to combine a `<label>` with additional context:

```html
<label for="email" id="lbl">Email</label>
<input id="email" aria-labelledby="lbl hint" />
<span id="hint">(required)</span>
```

This rule reports this as a violation because `aria-labelledby` overrides `label`. To suppress the warning for this pattern:

```json
{
  "nodeRules": [
    {
      "selector": "input[aria-labelledby]",
      "rules": {
        "no-redundant-accessible-name": false
      }
    }
  ]
}
```

## Known Limitations

- **CSS generated content**: Content from `::before` / `::after` pseudo-elements is not detectable by static analysis and is not included in the naming source check.
- **SVG `<title>`**: The `<title>` child element of SVG provides an accessible name for SVG elements, but this is distinct from the HTML `title` attribute and is not currently covered by this rule.
- **`aria-describedby`**: This rule only checks accessible _name_ sources. The accessible _description_ (`aria-describedby`) is a separate concept and is not in scope.

## See Also

- [Issue #1478](https://github.com/markuplint/markuplint/issues/1478)
- [`require-accessible-name`](../require-accessible-name/README.md)
- [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/)
- [WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html)
