---
sidebar_position: 3
title: deprecated-element
---

# `deprecated-element` Rule Changes

This page covers a split and a scope change in the `deprecated-element` rule. If you use this rule at all, read on.

## Summary

| Change                                                       | Who is affected                         |
| ------------------------------------------------------------ | --------------------------------------- |
| Split into `no-obsolete-element` and `no-deprecated-element` | Every config using `deprecated-element` |

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

:::note Not related to this rule: non-standard element detection
`deprecated-element` never detected non-standard elements — only obsolete and deprecated ones, both handled above. Non-standard detection (e.g. `<bgsound>`) lives in a completely separate v4 rule, `no-unsupported-features`, behind its `checkNonStandard` option (`false` by default, so it did nothing unless a config explicitly opted in). That option is now the independent `no-nonstandard-features` rule — see [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names) for the full `no-unsupported-features` split.
:::
