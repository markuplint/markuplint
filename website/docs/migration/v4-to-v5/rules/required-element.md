---
sidebar_position: 2
title: required-element
---

# `required-element` Rule Changes

This page covers a rename and a default value change in the `required-element` rule. If you use this rule to check for required child elements, read on.

## Summary

| Change                                            | Who is affected                                           |
| ------------------------------------------------- | --------------------------------------------------------- |
| Renamed to `require-element`                      | Every config using this rule                              |
| `ignoreOmittedElements` default: `false` → `true` | Configs relying on ghost elements to satisfy requirements |

## Rule renamed

`required-element` is now `require-element`, following the v5 naming convention: `require-*`, singular, for missing-thing checks.

```json
{
  "rules": {
    "require-element": ["meta[charset=\"UTF-8\"]"]
  }
}
```

:::tip
The old name keeps working. Markuplint reports a deprecation warning and applies your config to `require-element` automatically, until the old name is removed in v6. The full rename list is in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

## What changed

HTML allows certain tags to be omitted. For example, `<tbody>` is optional inside `<table>`. When omitted, the HTML parser still creates a "ghost" node for it internally.

:::caution Breaking Change
In v5, ghost elements are **ignored** by default. Only elements explicitly written in the source code satisfy the `required-element` check.
:::

### Before (v4)

The ghost `<tbody>` satisfied the requirement. No violation was reported:

```html
<!-- No violation in v4 -->
<table>
  <tr>
    <td>Text</td>
  </tr>
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

### After (v5)

The same config now reports a violation because the ghost `<tbody>` is ignored.

## How to fix

You have two options.

**Option 1: Write the element explicitly** (recommended):

```html
<table>
  <tbody>
    <tr>
      <td>Text</td>
    </tr>
  </tbody>
</table>
```

**Option 2: Restore the v4 behavior** by setting `ignoreOmittedElements` to `false`:

```json
{
  "nodeRules": [
    {
      "selector": "table",
      "rules": {
        "require-element": {
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

:::tip
Writing elements explicitly makes your HTML clearer and avoids relying on parser-generated ghost nodes. Option 1 is recommended.
:::
