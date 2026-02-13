# `required-element` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who use the `required-element` rule

## Summary of Changes

| Change | Impact |
|--------|--------|
| `ignoreOmittedElements` default changed from `false` to `true` | Configs relying on ghost elements to satisfy requirements |

## `ignoreOmittedElements` Default Value

HTML allows certain tags to be omitted (e.g., `<tbody>`). The HTML parser implicitly creates these omitted elements as ghost nodes.

In v4, ghost elements satisfied the `required-element` requirement by default. In v5, ghost elements are **ignored** by default — only elements explicitly written in the source satisfy the requirement.

### v4

Ghost `<tbody>` satisfies the requirement (default `ignoreOmittedElements: false`):

```html
<!-- No violation in v4 -->
<table>
  <tr><td>Text</td></tr>
</table>
```

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "required-element": ["tbody"]
      }
    }
  ]
}
```

### v5

The same config now reports a violation because ghost `<tbody>` is ignored (default `ignoreOmittedElements: true`). Either write `<tbody>` explicitly:

```html
<table>
  <tbody>
    <tr><td>Text</td></tr>
  </tbody>
</table>
```

Or restore the v4 behavior by explicitly setting the option to `false`:

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "required-element": {
          "value": ["tbody"],
          "options": {
            "ignoreOmittedElements": false
          }
        }
      }
    }
  ]
}
```
