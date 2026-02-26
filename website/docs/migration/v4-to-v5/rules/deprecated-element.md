---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` Rule Changes

This page covers a scope change in the `deprecated-element` rule. If you relied on this rule to detect non-standard elements, read on.

## Summary

| Change                                                            | Who is affected                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Non-standard element detection moved to `no-unsupported-features` | Configs using `deprecated-element` to catch non-standard elements |

## What changed

In v4, `deprecated-element` detected three categories:

- **Deprecated** elements
- **Obsolete** elements
- **Non-standard** elements

In v5, non-standard element detection has been moved to the new `no-unsupported-features` rule. `deprecated-element` now only detects deprecated and obsolete elements.

### Before (v4)

`deprecated-element` automatically flagged non-standard elements like `<bgsound>`:

```html
<!-- Reported by deprecated-element in v4 -->
<bgsound src="music.mid"></bgsound>
```

### After (v5)

`deprecated-element` no longer reports non-standard elements.

## How to fix

Enable `no-unsupported-features` with the `checkNonStandard` option:

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

:::tip
If you use the `recommended` preset, `no-unsupported-features` is already enabled via the `compat` preset. No action is needed.
:::
