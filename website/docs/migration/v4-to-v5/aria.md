---
sidebar_position: 4
title: ARIA
---

# ARIA Changes

v5 adds ARIA 1.3 support and changes the default ARIA version to 1.3. The `wai-aria` umbrella rule is also removed in favour of its 21 independent successor rules.

## What changed

| Change                                          | Who is affected                                     |
| ----------------------------------------------- | --------------------------------------------------- |
| ARIA 1.3 support added (now default)            | All users                                           |
| `generic` role becomes transparent in 1.3       | All users                                           |
| `<aside>` conditional role mapping in 1.3       | All users                                           |
| `image` / `img` role synonym in 1.3             | All users                                           |
| "No role permitted" now strictly forbids `role` | Users writing `role="presentation"` etc. on `<img>` |
| `wai-aria` umbrella rule removed                | Config files using `wai-aria` at all                |
| `input-button-non-empty-value` removed          | Config files using that rule                        |
| Every `wai-aria-*` rule renamed                 | Config files naming those rules directly            |

:::tip
Rule renames and splits across the whole catalog — ARIA and otherwise — are listed in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).
:::

## ARIA version configuration

The default ARIA version is now `"1.3"`. If you need the previous behavior, set `ariaVersion` globally via `ruleCommonSettings`. See the [Config migration guide](/docs/migration/v4-to-v5/config) for details on this new property.

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

Only two rules also accept a per-rule `options.ariaVersion` override: `require-accessible-name` and `no-refer-to-non-existent-id`.

```json
{
  "rules": {
    "require-accessible-name": {
      "options": {
        "ariaVersion": "1.2"
      }
    }
  }
}
```

Every other ARIA rule — the 21 successors of the former `wai-aria` umbrella — reads `ruleCommonSettings.ariaVersion` only. They have no per-rule version option of their own, so v4's `wai-aria` `options.version` has nowhere to move to.

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
| `presentation` / `none` transparent for parent role | Yes               | Yes     |

## `<aside>` conditional role mapping (ARIA 1.3)

The `<aside>` element now uses **conditional role mapping** per the ARIA 1.3 spec:

- When `<aside>` is **not** a descendant of `<article>`, `<aside>`, `<blockquote>`, `<details>`, `<dialog>`, `<fieldset>`, `<figure>`, `<nav>`, `<section>`, or `<td>` → role is `complementary`
- When `<aside>` **is** a descendant of one of those elements → role is `generic`, unless the `<aside>` itself has an accessible name (e.g. `aria-label`), in which case it keeps `complementary`

`no-nested-top-level-landmark` — the rule split off from `landmark-roles` — deliberately does not check `complementary` as a top-level landmark for this reason. Its selector-based detection cannot tell a demoted `<aside>` apart from a true one, so checking it would produce a false positive on any `<aside>` nested in a sectioning ancestor.

:::caution
Since ARIA 1.3 is now the default, this change affects all users immediately. If your markup uses `<aside>` inside sectioning elements, you may see new or different lint results.
:::

## `image` / `img` role synonym (ARIA 1.3)

In ARIA 1.3, `image` is the primary role name and `img` is a synonym. When either appears in an element's permitted roles, both are accepted. This affects elements whose permitted-roles list includes `img` — `<img>` itself isn't one of them, since its own implicit role is already `img`; `<embed>` and `<iframe>` are:

```html
<!-- ARIA 1.2: role="image" is not a permitted role for <embed> -->
<!-- ARIA 1.3: role="image" is accepted as a synonym of the permitted "img" -->
<embed src="chart.svg" role="image" />
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

## Umbrella rule removed {#umbrella-rule-removed}

In stable v4, `wai-aria` was a single rule that internally implemented around a dozen ARIA checks, each toggleable via a boolean option (`checkingDeprecatedRole`, `disallowSetImplicitProps`, `checkingRequiredOwnedElements`, and so on). During v5's alpha/rc development, those checks — and a few genuinely new ones — were carved out one at a time into independent rules: `no-abstract-role`, `no-unknown-role`, `require-owned-elements`, `no-focusable-in-aria-hidden`, and so on. By the time this final redesign started, 20 such rules already existed on their own, and `wai-aria` itself had shrunk to a thin option-toggle shim re-triggering them. The 21st rule — one with no prior toggle in `wai-aria` at all — is new below.

v5 removes `wai-aria` entirely, along with the option-toggle mechanism it alone consumed.

`wai-aria: v` still works: markuplint reports a deprecation warning and expands the config to all 21 successor rules — the 20 above, plus the new `no-aria-on-unsupported-element` — with the same severity and reason.

:::caution The per-check option toggles are dropped
They have no successor to route to. Every one of these rules already ran its single check unconditionally once split off, and none of their schemas accept an `options` object at all.

To keep a check disabled that you previously turned off via an option, disable that specific rule instead:

```json
{
  "rules": {
    "no-redundant-role": false
  }
}
```

That replaces the v4 pattern of disabling it via the umbrella's `disallowSetImplicitRole: false`.
:::

### New rule: `no-aria-on-unsupported-element`

The umbrella's very first check — disallowing `role` and `aria-*` on an element whose spec data marks it as not supporting ARIA attributes at all — had no independent successor rule until v5. It is now `no-aria-on-unsupported-element`.

### Removed: `input-button-non-empty-value` {#removed-input-button-non-empty-value}

This rule detected `<input type="button" value="">` as a proxy for "no accessible name," but it both over-reported (it flagged buttons with an `aria-label`, which do have an accessible name) and under-reported (it missed a missing `value` attribute entirely, which computes to the same empty accessible name). `require-accessible-name` already covers this case correctly, so v5 removes the rule in favour of it.

### `wai-aria-*` rules renamed

Every rule previously prefixed `wai-aria-` drops the prefix and is renamed to match the v5 naming convention — `wai-aria-non-existent-role` becomes `no-unknown-role`, `wai-aria-required-owned-elements` becomes `require-owned-elements`, and so on. Two are additionally split:

| Former rule                 | Split into                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| `wai-aria-disallowed-props` | `no-prohibited-naming`, `element-supports-aria-prop`, `role-supports-aria-prop` |
| `wai-aria-implicit-props`   | `no-redundant-aria-prop` (`warning`), `no-contradictory-aria-prop` (`error`)    |

Two ARIA-adjacent rules are also split:

- `landmark-roles` → `no-nested-top-level-landmark` (the `ignoreRoles` half) and `require-landmark-label` (the `labelEachArea` half)
- `required-h1` → `require-h1` (the missing-`<h1>` half) and `no-duplicate-h1` (the `expected-once` half). Both now default to `warning`: WCAG Technique H42, the closest cited basis for either check, is non-normative.

All old names keep working via a deprecation-warning alias until they are removed in v6. The full mapping is in [Renames and Splits](/docs/migration/v4-to-v5/rules/rule-names).

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
