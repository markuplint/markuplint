---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` Rule Changes

This page covers a split and a scope change in the `deprecated-element` rule. If you use this rule at all, read on.

## Summary

| Change                                                            | Who is affected                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| Split into `no-obsolete-element` and `no-deprecated-element`      | Every config using `deprecated-element`                           |
| Non-standard element detection moved to `no-nonstandard-features` | Configs using `deprecated-element` to catch non-standard elements |

## Rule split into two

`deprecated-element` bundled two independent checks: elements the spec has removed entirely (**obsolete** — a MUST-level conformance violation) and elements the spec still defines but marks discouraged (**deprecated** — factual data sourced from MDN/BCD). In v5 each is its own rule, with its own severity:

| New rule                | What it checks                                               | Default severity |
| ----------------------- | ------------------------------------------------------------ | ---------------- |
| `no-obsolete-element`   | Elements HTML LS §16.2 removed entirely (e.g. `<marquee>`)   | `error`          |
| `no-deprecated-element` | Elements the spec still defines but MDN/BCD marks deprecated | `warning`        |

```json
{
  "rules": {
    "no-obsolete-element": true,
    "no-deprecated-element": true
  }
}
```

:::tip
`deprecated-element` keeps working. Markuplint reports a deprecation warning and expands your config to both rules automatically, until the old name is removed in v6. The full split list is in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

:::caution Severity change
The deprecated half drops from `error` to `warning`, because MDN/BCD deprecation is factual data rather than a spec MUST. The obsolete half stays `error`.
:::

## Non-standard detection moved

In v4, `deprecated-element` detected three categories: **deprecated**, **obsolete**, and **non-standard** elements.

In v5, non-standard detection has moved to the independent `no-nonstandard-features` rule, itself split off from the former `no-unsupported-features` rule. Neither `no-obsolete-element` nor `no-deprecated-element` ever detects non-standard elements.

### Before (v4)

`deprecated-element` automatically flagged non-standard elements like `<bgsound>`:

```html
<!-- Reported by deprecated-element in v4 -->
<bgsound src="music.mid"></bgsound>
```

### After (v5)

Neither successor rule reports non-standard elements. To restore this detection, enable `no-nonstandard-features`:

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

:::tip
If you use the `recommended` preset, this is already enabled via the `compat` preset. No action is needed.
:::
