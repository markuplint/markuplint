# `required-element`

Renamed to `require-element`. Alias until v6. See [Renames and splits](../rule-names.md).

## `ignoreOmittedElements` default

v4 default: `false` — parser-inserted ghost nodes (for example omitted `<tbody>`) **satisfied** the requirement.

v5 default: `true` — only elements present in the source count.

```html
<table>
  <tr>
    <td>Text</td>
  </tr>
</table>
```

With `required-element` / `require-element`: `["tbody"]` on `table`, v4 was clean; v5 reports.

Restore v4:

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "require-element": {
          "value": ["tbody"],
          "options": { "ignoreOmittedElements": false }
        }
      }
    }
  ]
}
```
