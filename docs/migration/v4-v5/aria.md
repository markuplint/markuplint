# ARIA Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who set ARIA version options
- **Custom rule authors** who access ARIA role or property information
- **Users** who lint ARIA attributes with rules like `wai-aria`

## Summary of Changes

| Change | Impact |
|--------|--------|
| ARIA 1.3 support added | New behaviors when `ariaVersion` is `"1.3"` |
| `generic` role becomes transparent in ARIA 1.3 | Content model validation |
| `image` / `img` role synonym in ARIA 1.3 | Permitted roles validation |
| `wai-aria` rule option renamed | Config files using `checkingRequiredOwnedElements` |

## ARIA 1.3 Support

v5 adds ARIA 1.3 as a selectable version. The default remains `"1.2"`, so **existing users see no behavioral change** unless they opt in.

### How to Enable

Set `ariaVersion` globally via `ruleCommonSettings` (see [config migration guide](./config.md)):

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.3"
  }
}
```

Or per rule:

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.3"
      }
    }
  }
}
```

## Generic Role Transparency

The most significant change in ARIA 1.3 is that elements with the `generic` role (including bare `<div>` and `<span>`) become **transparent** during accessibility tree ownership traversal.

### v4 (ARIA 1.2)

A `<div>` wrapper between a `<ul>` and its `<li>` children breaks the parent-child role relationship:

```html
<!-- ARIA 1.2: FAILS — <div> blocks the list > listitem relationship -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### v5 with ARIA 1.3

ARIA 1.3 defines that user agents MUST ignore intervening elements with the `generic` or `none` role:

```html
<!-- ARIA 1.3: PASSES — <div> (generic) is transparent -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

This affects:

- **Required Accessibility Parent Role** (`matchesContextRole`) — parent elements with `generic` or `none` roles are skipped
- **Allowed Accessibility Child Roles** (`hasRequiredOwnedElement`) — `generic` elements are transparent when traversing descendants
- **Presentational Roles Conflict Resolution** — `generic` elements are skipped when searching for non-presentational ancestors

### Version Gating

| Behavior | `'1.1'` / `'1.2'` | `'1.3'` |
| --- | --- | --- |
| `generic` transparent for child roles | No | Yes |
| `generic` transparent for parent role | No | Yes |
| `presentation` / `none` transparent for child roles | Yes | Yes |
| `presentation` / `none` transparent for parent role | No | Yes |

## Image / IMG Role Synonym

In ARIA 1.3, `image` is the primary role name and `img` is a synonym. When either appears in an element's permitted roles, both are accepted:

```html
<!-- ARIA 1.2: permitted roles include only "img" -->
<!-- ARIA 1.3: permitted roles include both "image" and "img" -->
<img alt="photo" />
```

## Rule Option Rename

The `wai-aria` rule option for checking owned elements has been renamed:

| v5 (new) | v4 (deprecated) |
|----------|-----------------|
| `checkingAllowedAccessibilityChildRoles` | `checkingRequiredOwnedElements` |

Both options still work — the check runs only when both are `true` (the default). Existing configs using the old name continue to function.

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "checkingAllowedAccessibilityChildRoles": false
      }
    }
  }
}
```

## Terminology Changes

ARIA 1.3 renames several concepts. The `ARIARole` type exposes both the new and deprecated property names:

| ARIA 1.3 (new) | ARIA 1.2 (deprecated) |
|-----------------|-----------------------|
| `requiredAccessibilityParentRole` | `requiredContextRole` |
| `allowedAccessibilityChildRoles` | `requiredOwnedElements` |

Both properties hold the same values. Internal code uses the new names; the old names are retained as `@deprecated` aliases.
