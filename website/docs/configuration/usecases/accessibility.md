# Customizing accessibility rules

The recommended preset already includes all accessibility rules via the `markuplint:a11y` base preset. This guide covers how to customize their behavior.

## Using a11y rules only

If you want **only** accessibility rules without HTML conformance or style checking:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:a11y"]
}
```

To combine accessibility with HTML conformance checking (but without style or performance rules):

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:a11y", "markuplint:html-standard"]
}
```

## Adjusting severity during adoption

When introducing Markuplint to an existing project, you may want to treat accessibility violations as warnings first and tighten them over time:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/*": "warning"
  }
}
```

## Disabling specific rules

To disable a specific accessibility rule while keeping the rest:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "a11y/no-accesskey": false
  }
}
```

## What the a11y preset checks

The `markuplint:a11y` preset includes rules for:

- **WAI-ARIA conformance** — valid `role` and `aria-*` attributes
- **Accessible names** — elements that require names have them (e.g., form controls, images, landmarks)
- **Landmark structure** — `banner`, `main`, `complementary`, `contentinfo` as top-level landmarks
- **Heading structure** — `<h1>` is present, heading levels are not skipped
- **Label associations** — `<label>` elements are properly linked to controls
- **Media accessibility** — `<audio>` and `<video>` have `<track>` elements
- **Interactive content** — no `accesskey`, restricted `tabindex`, autoplay constraints

See [Preset rulesets](/docs/guides/presets#preset-a11y) for the full list of rules.
