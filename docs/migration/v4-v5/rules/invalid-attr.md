# `invalid-attr` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who customized `invalid-attr` options with `allowAttrs`, `disallowAttrs`, or `attrs`

## Summary of Changes

| Change | Impact |
|--------|--------|
| `{ type: X }` wrapper removed | Configs using `{ "value": { "type": "Int" } }` etc. |
| `attrs` option deleted | Configs using the deprecated `attrs` option (deprecated since v3.7.0) |
| Object format deprecated | Configs using the object format for `allowAttrs` / `disallowAttrs` |

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
  "invalid-attr": {
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

The `attrs` option, deprecated since v3.7.0, has been removed. Use `allowAttrs` and `disallowAttrs` instead.

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
  "invalid-attr": {
    "options": {
      "allowAttrs": [
        "x-data",
        { "name": "x-count", "value": "Int" },
        { "name": "x-color", "value": { "enum": ["red", "blue"] } },
        { "name": "x-id", "value": { "pattern": "/^[a-z]+$/" } }
      ],
      "disallowAttrs": ["x-banned"]
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
  "invalid-attr": {
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
