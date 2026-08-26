# `invalid-attr` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who customized `invalid-attr` options with `allowAttrs`, `disallowAttrs`, or `attrs`
- **Everyone** using `invalid-attr` at all — it's split into four rules in v5

## Summary of Changes

| Change | Impact |
|--------|--------|
| Split into four rules | Configs using `invalid-attr` for anything — the old name still works via a deprecation-warning alias, removed in v6 |
| `{ type: X }` wrapper removed | Configs using `{ "value": { "type": "Int" } }` etc. |
| `attrs` option deleted | Configs using the deprecated `attrs` option (deprecated since v3.7.0) |
| Object format deprecated | Configs using the object format for `allowAttrs` / `disallowAttrs` |

## Rule Split into Four

`invalid-attr` bundled four independent checks into one rule. In v5, each is its own rule, so you can enable, disable, or set a different severity for each independently:

| New rule | What it checks | `allowAttrs` / `disallowAttrs` |
|----------|-----------------|-------------------------------|
| `no-unknown-attr` | Attribute name not defined by the spec at all (typo candidates, case mismatches) | `allowAttrs` applies |
| `no-disallowed-attr` | Attribute defined by the spec but disallowed here (`noUse`, an unmet conditional-allow condition, `is` on an autonomous custom element) | `allowAttrs` applies |
| `no-invalid-attr-value` | Attribute value fails its type/grammar check | `allowAttrs` applies |
| `no-restricted-attr` | User-defined denylist — this is the only one of the four `disallowAttrs` applies to | `disallowAttrs` applies |

`invalid-attr: v` still works — a deprecation warning is reported, and the config is expanded to all four rules automatically: `allowAttrs` is copied to `no-unknown-attr`/`no-disallowed-attr`/`no-invalid-attr-value`, and `disallowAttrs` is copied to `no-restricted-attr` (only added when actually configured). The old name is removed in v6.

```json
{
  "rules": {
    "no-unknown-attr": true,
    "no-disallowed-attr": true,
    "no-invalid-attr-value": true,
    "no-restricted-attr": {
      "options": {
        "disallowAttrs": ["x-banned"]
      }
    }
  }
}
```

## `{ type: X }` Wrapper Removed

In v4, attribute values in `allowAttrs` and `disallowAttrs` could be specified with a `{ type: X }` wrapper object. In v5, this wrapper has been removed. Specify the type string directly.

### v4

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": { "type": "Int" }
        }
      ]
    }
  }
}
```

### v5

```json
{
  "no-unknown-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-count",
          "value": "Int"
        }
      ]
    }
  }
}
```

`{ enum: [...] }` and `{ pattern: "..." }` continue to work as before.

## `attrs` Option Deleted

The `attrs` option, deprecated since v3.7.0, has been removed. Use `allowAttrs` and `disallowAttrs` instead — routed to the appropriate new rule.

### v4

```json
{
  "invalid-attr": {
    "options": {
      "attrs": {
        "x-data": { "type": "Any" },
        "x-count": { "type": "Int" },
        "x-color": { "enum": ["red", "blue"] },
        "x-id": { "pattern": "/^[a-z]+$/" },
        "x-banned": { "disallowed": true }
      }
    }
  }
}
```

### v5

```json
{
  "rules": {
    "no-unknown-attr": {
      "options": {
        "allowAttrs": [
          "x-data",
          { "name": "x-count", "value": "Int" },
          { "name": "x-color", "value": { "enum": ["red", "blue"] } },
          { "name": "x-id", "value": { "pattern": "/^[a-z]+$/" } }
        ]
      }
    },
    "no-restricted-attr": {
      "options": {
        "disallowAttrs": ["x-banned"]
      }
    }
  }
}
```

## Object Format Deprecated

The object format for `allowAttrs` and `disallowAttrs` is deprecated. The object format still works in v5 but will be removed in a future version. Use the array format instead.

### v4

```json
{
  "invalid-attr": {
    "options": {
      "allowAttrs": {
        "x-attr": "Int"
      }
    }
  }
}
```

### v5

```json
{
  "no-unknown-attr": {
    "options": {
      "allowAttrs": [
        {
          "name": "x-attr",
          "value": "Int"
        }
      ]
    }
  }
}
```
