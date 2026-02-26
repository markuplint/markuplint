---
sidebar_position: 4
title: ARIA
---

# ARIA Changes

v5 adds ARIA 1.3 support and changes the default ARIA version to 1.3. The `wai-aria` rule option is also renamed.

## What changed

| Change                                    | Who is affected                                      |
| ----------------------------------------- | ---------------------------------------------------- |
| ARIA 1.3 support added (now default)      | All users                                            |
| `generic` role becomes transparent in 1.3 | Users enabling ARIA 1.3                              |
| `image` / `img` role synonym in 1.3       | Users enabling ARIA 1.3                              |
| `wai-aria` option renamed                 | Users with `checkingRequiredOwnedElements` in config |

## ARIA version configuration

The default ARIA version is now `"1.3"`. If you need the previous behavior, set `ariaVersion` globally via `ruleCommonSettings`. See the [Config migration guide](/docs/migration/v4-to-v5/config) for details on this new property.

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

You can also set it per rule:

```json
{
  "rules": {
    "wai-aria": {
      "options": {
        "version": "1.2"
      }
    }
  }
}
```

:::note
The default is `"1.3"`. You only need to change your config if you want ARIA 1.2 behavior.
:::

## Generic role transparency (ARIA 1.3)

This is the most significant change in ARIA 1.3. Elements with the `generic` role -- including bare `<div>` and `<span>` -- become **transparent** in accessibility tree traversal.

### Before (ARIA 1.2)

A `<div>` wrapper between `<ul>` and `<li>` breaks the parent-child role relationship:

```html
<!-- ARIA 1.2: Error -- <div> blocks the list > listitem relationship -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### After (ARIA 1.3)

The same HTML passes. ARIA 1.3 says user agents must ignore elements with the `generic` or `none` role:

```html
<!-- ARIA 1.3: OK -- <div> (generic) is transparent -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

### Version comparison

| Behavior                                            | `'1.1'` / `'1.2'` | `'1.3'` |
| --------------------------------------------------- | ----------------- | ------- |
| `generic` transparent for child roles               | No                | Yes     |
| `generic` transparent for parent role               | No                | Yes     |
| `presentation` / `none` transparent for child roles | Yes               | Yes     |
| `presentation` / `none` transparent for parent role | No                | Yes     |

## `image` / `img` role synonym (ARIA 1.3)

In ARIA 1.3, `image` is the primary role name and `img` is a synonym. When either appears in an element's permitted roles, both are accepted:

```html
<!-- ARIA 1.2: permitted roles include only "img" -->
<!-- ARIA 1.3: permitted roles include both "image" and "img" -->
<img alt="photo" />
```

## Rule option renamed

The `wai-aria` rule option `checkingRequiredOwnedElements` has been renamed:

| v5 (new)                                 | v4 (deprecated)                 |
| ---------------------------------------- | ------------------------------- |
| `checkingAllowedAccessibilityChildRoles` | `checkingRequiredOwnedElements` |

:::tip
The old name still works. Update it when convenient -- there is no rush.
:::

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

## Terminology changes (for custom rule authors)

:::info For custom rule authors
This section covers internal API changes. If you only configure ARIA rules, you can skip it.
:::

ARIA 1.3 renames several internal concepts. The `ARIARole` type exposes both old and new property names:

| ARIA 1.3 (new)                    | ARIA 1.2 (deprecated)   |
| --------------------------------- | ----------------------- |
| `requiredAccessibilityParentRole` | `requiredContextRole`   |
| `allowedAccessibilityChildRoles`  | `requiredOwnedElements` |

Both properties hold the same values. The old names are kept as `@deprecated` aliases.
