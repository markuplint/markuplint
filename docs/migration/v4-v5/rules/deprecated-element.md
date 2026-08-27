# `deprecated-element` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who use `deprecated-element`

## Summary of Changes

| Change | Impact |
|--------|--------|
| Split into `no-obsolete-element` and `no-deprecated-element` | Configs using `deprecated-element` for anything — the old name still works via a deprecation-warning alias, removed in v6 |

## Rule Split into Two

`deprecated-element` bundled two independent checks: elements the spec has removed entirely (**obsolete**, a MUST-level conformance violation) and elements the spec still defines but marks discouraged (**deprecated**, factual data sourced from MDN/BCD). In v5, each is its own rule with its own severity:

| New rule | What it checks | Default severity |
|----------|-----------------|-------------------|
| `no-obsolete-element` | Elements HTML LS §16.2 removed entirely (e.g., `<marquee>`) | `error` |
| `no-deprecated-element` | Elements the spec still defines but MDN/BCD marks deprecated | `warning` |

`deprecated-element: v` still works — a deprecation warning is reported, and the config is expanded to both rules automatically. The old name is removed in v6.

```json
{
  "rules": {
    "no-obsolete-element": true,
    "no-deprecated-element": true
  }
}
```

## Not Related to This Rule: Non-Standard Detection

`deprecated-element` never detected non-standard elements in v4 — verified against the rule as it stood immediately before this redesign (`spec.obsolete`/`spec.deprecated` only, no `spec.nonStandard` check). Non-standard detection (e.g., `<bgsound>`) lived in a separate v4 rule, `no-unsupported-features`, behind its `checkNonStandard` option (`false` by default). That option is now the independent `no-nonstandard-features` rule — see the `no-unsupported-features` row in [Rule Renames and Splits](./rule-names.md).
