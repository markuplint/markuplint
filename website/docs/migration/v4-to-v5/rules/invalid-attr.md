---
sidebar_position: 1
title: 'invalid-attr'
---

# `invalid-attr`

Split into four rules. Option formats that v4's schema allowed and v5 no longer does are breaking.

| New rule                | What it checks                 |
| ----------------------- | ------------------------------ |
| `no-unknown-attr`       | Name not in the spec           |
| `no-disallowed-attr`    | Name known but disallowed here |
| `no-invalid-attr-value` | Value type/grammar             |
| `no-restricted-attr`    | User `disallowAttrs` only      |

`aria-*` and `role` are skipped by the three spec-checking rules; ARIA rules own them.

| Old option                         | Lands on                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `allowAttrs`                       | `no-unknown-attr`, `no-disallowed-attr`, `no-invalid-attr-value`         |
| `ignoreAttrNamePrefix`             | `no-unknown-attr`, `no-disallowed-attr`                                  |
| `allowToAddPropertiesForPretender` | `no-unknown-attr`                                                        |
| `disallowAttrs`                    | `no-restricted-attr` (alias adds this rule only when the option was set) |

`invalid-attr` still expands via deprecation warning until v6. See [Renames and splits](/docs/migration/v4-to-v5/rules/rule-names).

## `{ type: X }` wrapper removed

v4 `ValueRule` allowed `{ type: AttributeType }`. v5 `allowAttrs` values are the type string (or pattern) directly.

```json
{
  "rules": {
    "no-unknown-attr": {
      "options": {
        "allowAttrs": [{ "name": "x-count", "value": "Int" }]
      }
    }
  }
}
```

The object map form of `allowAttrs` / `disallowAttrs` is deprecated on the new rules (array form is preferred).

The old `attrs` option is gone; use `allowAttrs` / `disallowAttrs`.
