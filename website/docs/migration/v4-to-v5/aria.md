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
| `generic` role becomes transparent in 1.3 | All users                                            |
| `<aside>` conditional role mapping in 1.3 | All users                                            |
| `image` / `img` role synonym in 1.3       | All users                                            |
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

A `<div>` wrapper between a `tablist` and its `tab` children breaks the parent-child role relationship:

```html
<!-- ARIA 1.2: Error -- <div> blocks the tablist > tab relationship -->
<div role="tablist">
  <div class="wrapper">
    <button role="tab">Tab 1</button>
  </div>
</div>
```

### After (ARIA 1.3)

The same HTML passes. ARIA 1.3 says user agents must ignore elements with the `generic` or `none` role:

```html
<!-- ARIA 1.3: OK -- <div> (generic) is transparent -->
<div role="tablist">
  <div class="wrapper">
    <button role="tab">Tab 1</button>
  </div>
</div>
```

### Version comparison

| Behavior                                            | `'1.1'` / `'1.2'` | `'1.3'` |
| --------------------------------------------------- | ----------------- | ------- |
| `generic` transparent for child roles               | No                | Yes     |
| `generic` transparent for parent role               | No                | Yes     |
| `presentation` / `none` transparent for child roles | Yes               | Yes     |
| `presentation` / `none` transparent for parent role | No                | Yes     |

## `<aside>` conditional role mapping (ARIA 1.3)

The `<aside>` element now uses **conditional role mapping** per the ARIA 1.3 spec:

- When `<aside>` is **not** a descendant of `<article>`, `<aside>`, `<main>`, `<nav>`, or `<section>` → role is `complementary`
- When `<aside>` **is** a descendant of one of those sectioning elements → role is `generic`

The `landmark-roles` rule has been updated accordingly: `complementary` is no longer checked as a top-level landmark.

:::caution
Since ARIA 1.3 is now the default, this change affects all users immediately. If your markup uses `<aside>` inside sectioning elements, you may see new or different lint results.
:::

## `image` / `img` role synonym (ARIA 1.3)

In ARIA 1.3, `image` is the primary role name and `img` is a synonym. When either appears in an element's permitted roles, both are accepted:

```html
<!-- ARIA 1.2: permitted roles include only "img" -->
<!-- ARIA 1.3: permitted roles include both "image" and "img" -->
<img alt="photo" />
```

## "No role permitted" is now strict

When [ARIA in HTML](https://w3c.github.io/html-aria/) marks an element state as "No role permitted", v5 forbids _any_ explicit `role` attribute on that element — even a value matching the implicit role. v4 silently allowed values matching the implicit role.

Most commonly affected:

```html
<!-- ❌ v5 errors — implicit role is `presentation` but explicit role is forbidden -->
<img src="spacer.png" alt="" role="presentation" />
<img src="spacer.png" alt="" role="none" />
```

Other elements newly affected by the same rule (when they were previously written with a role matching the implicit):

| Pattern                                                                       | Implicit role | Action        |
| ----------------------------------------------------------------------------- | ------------- | ------------- |
| `<img>` (no `alt`, no accessible name) + any role                             | `img`         | Remove `role` |
| `<area href="...">` + any role                                                | `link`        | Remove `role` |
| `<figure><figcaption>...</figcaption></figure>` + any role on `<figure>`      | `figure`      | Remove `role` |
| `<tr>` inside `<table>` / `[role=table\|grid\|treegrid]` + any role on `<tr>` | `row`         | Remove `role` |
| `<html role="document">` (ARIA 1.1)                                           | `document`    | Remove `role` |
| `<meter>` + any role                                                          | `meter`       | Remove `role` |
| `<input type="email\|number\|password\|...">` + matching implicit role        | various       | Remove `role` |

**Migration:** remove the offending `role` attribute. The implicit role from HTML-AAM still applies, so accessibility behavior is preserved.

See Issue [#3641](https://github.com/markuplint/markuplint/issues/3641) for background.

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
