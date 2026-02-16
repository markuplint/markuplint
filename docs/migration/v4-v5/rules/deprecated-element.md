# `deprecated-element` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who relied on `deprecated-element` to detect non-standard elements

## Summary of Changes

| Change | Impact |
|--------|--------|
| Non-standard element detection moved to `no-unsupported-features` | Configs using `deprecated-element` alone to catch non-standard elements |

## Non-Standard Detection Moved

In v4, `deprecated-element` detected three categories: **deprecated**, **obsolete**, and **non-standard** elements.

In v5, non-standard detection has been moved to the new `no-unsupported-features` rule with the `checkNonStandard` option. `deprecated-element` now only detects deprecated and obsolete elements.

### v4

`deprecated-element` automatically detected non-standard elements (e.g., `<bgsound>`):

```html
<!-- Reported by deprecated-element in v4 -->
<bgsound src="music.mid">
```

### v5

`deprecated-element` no longer reports non-standard elements. To restore this detection, enable `no-unsupported-features`:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

If you use the `recommended` preset, this is already enabled automatically via the `compat` preset — no action is required.
