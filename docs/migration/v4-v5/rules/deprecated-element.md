# `deprecated-element` Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who use `deprecated-element`, or relied on it to detect non-standard elements

## Summary of Changes

| Change | Impact |
|--------|--------|
| Split into `no-obsolete-element` and `no-deprecated-element` | Configs using `deprecated-element` for anything — the old name still works via a deprecation-warning alias, removed in v6 |
| Non-standard element detection moved to `no-nonstandard-features` | Configs using `deprecated-element` alone to catch non-standard elements |

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

## Non-Standard Detection Moved

In v4, `deprecated-element` detected three categories: **deprecated**, **obsolete**, and **non-standard** elements.

In v5, non-standard detection has moved to the independent `no-nonstandard-features` rule (itself split off from the former `no-unsupported-features` rule). `no-obsolete-element`/`no-deprecated-element` never detect non-standard elements.

### v4

`deprecated-element` automatically detected non-standard elements (e.g., `<bgsound>`):

```html
<!-- Reported by deprecated-element in v4 -->
<bgsound src="music.mid">
```

### v5

Neither `no-obsolete-element` nor `no-deprecated-element` reports non-standard elements. To restore this detection, enable `no-nonstandard-features`:

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

If you use the `recommended` preset, this is already enabled automatically via the `compat` preset — no action is required.
