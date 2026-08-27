---
sidebar_position: 4
title: 'ARIA'
---

# ARIA

v5 adds ARIA 1.3 and makes it the default (v4 used 1.2). The v4 `wai-aria` umbrella is replaced by 21 independent rules.

## What changed

| Change                                     | Who is affected                                                 |
| ------------------------------------------ | --------------------------------------------------------------- |
| Default ARIA version `"1.3"`               | Everyone                                                        |
| `generic` role is transparent in 1.3       | Content that wraps required owned roles in a `<div>` / `<span>` |
| `<aside>` conditional implicit role in 1.3 | Nested `<aside>`                                                |
| `image` / `img` role synonym in 1.3        | `role="image"` on elements that permit `img`                    |
| "No role permitted" is strict              | Explicit `role` matching the implicit role                      |
| `wai-aria` removed as a rule name          | Any config that named `wai-aria`                                |

Shared version: [Config](/docs/migration/v4-to-v5/config#rulecommonsettings). Catalog: [Renames and splits](/docs/migration/v4-to-v5/rules/rule-names).

## ARIA version

Default is `"1.3"`. To keep 1.2:

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

Only `require-accessible-name` and `no-refer-to-non-existent-id` still accept per-rule `options.ariaVersion`. The 21 `wai-aria` successors have **no** options object. v4 `wai-aria` `options.version` is dropped; use `ruleCommonSettings.ariaVersion`.

## Generic role transparency (ARIA 1.3)

Elements with implicit or explicit `generic` (bare `<div>` / `<span>`) are skipped when walking required parent/owned-child relationships.

```html
<!-- ARIA 1.2: fails list → listitem. ARIA 1.3: passes. -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

| Behavior                                            | `1.1` / `1.2` | `1.3` |
| --------------------------------------------------- | ------------- | ----- |
| `generic` transparent for child roles               | No            | Yes   |
| `generic` transparent for parent role               | No            | Yes   |
| `presentation` / `none` transparent for child roles | Yes           | Yes   |
| `presentation` / `none` transparent for parent role | Yes           | Yes   |

## `<aside>` conditional role (ARIA 1.3) {#aside-conditional-role-mapping-aria-13}

- Not a descendant of `<article>`, `<aside>`, `<blockquote>`, `<details>`, `<dialog>`, `<fieldset>`, `<figure>`, `<nav>`, `<section>`, or `<td>` → `complementary`
- Descendant of one of those → `generic`, unless the `<aside>` has an accessible name, in which case it stays `complementary`

`no-nested-top-level-landmark` does not treat `complementary` as a top-level landmark: a selector cannot tell a demoted `<aside>` from a real one.

## `image` / `img` synonym (ARIA 1.3)

When permitted roles include `img`, `image` is accepted (`<embed>`, `<iframe>`). `<img>` already has implicit `img`.

```html
<embed src="chart.svg" role="image" />
```

## "No role permitted" is strict

When [ARIA in HTML](https://w3c.github.io/html-aria/) says no role is permitted, v5 forbids **any** explicit `role`, including a value equal to the implicit role. v4 allowed that match.

```html
<img src="spacer.png" alt="" role="presentation" /> <img src="spacer.png" alt="" role="none" />
```

Remove the attribute. The implicit role from HTML-AAM still applies. Background: [issue #3641](https://github.com/markuplint/markuplint/issues/3641).

## `wai-aria` umbrella {#umbrella-rule-removed}

In v4, `wai-aria` ran many checks, some gated by boolean options.

`wai-aria: true` still works until v6: a deprecation warning, then expansion to all 21 rules with the same severity/reason. **Option toggles are not routed.** To turn a check off, disable that rule.

### Map of v4 options → v5 rules

| v4 option                        | v4 default | v5 rule                                                   |
| -------------------------------- | ---------- | --------------------------------------------------------- |
| `checkingValue`                  | `true`     | `no-invalid-aria-prop-value`                              |
| `checkingDeprecatedRole`         | `true`     | `no-deprecated-role`                                      |
| `checkingDeprecatedProps`        | `true`     | `no-deprecated-aria-prop`                                 |
| `permittedAriaRoles`             | `true`     | `permitted-roles`                                         |
| `checkingRequiredOwnedElements`  | `true`     | `require-owned-elements`                                  |
| `checkingPresentationalChildren` | `false`    | `no-aria-on-presentational-children`                      |
| `checkingInteractionInHidden`    | `false`    | `no-focusable-in-aria-hidden`                             |
| `disallowSetImplicitRole`        | `true`     | `no-redundant-role`                                       |
| `disallowSetImplicitProps`       | `true`     | `no-redundant-aria-prop` and `no-contradictory-aria-prop` |
| `disallowDefaultValue`           | `false`    | `no-default-aria-value`                                   |
| `version`                        | `"1.2"`    | `ruleCommonSettings.ariaVersion`                          |

v4 always ran (no option): `#ARIAAttrs: false` → `no-aria-on-unsupported-element`; unknown/abstract role; required ARIA properties; disallowed properties (`no-prohibited-naming`, `element-supports-aria-prop`, `role-supports-aria-prop`); global properties without a role → `aria-prop-requires-role`.

v4 `wai-aria` **did not** implement `require-parent-role` or `tab-requires-tabpanel`. The alias and `markuplint:a11y` still enable them.

### Extra reports vs v4 defaults

Because toggles are dropped, `wai-aria: true` (and `markuplint:a11y`) now also run:

- `no-aria-on-presentational-children` (was default off)
- `no-focusable-in-aria-hidden` (was default off)
- `no-default-aria-value` (was default off)
- `require-parent-role` (new)
- `tab-requires-tabpanel` (new)

Disable individually, for example:

```json
{
  "rules": {
    "no-aria-on-presentational-children": false,
    "no-focusable-in-aria-hidden": false,
    "no-default-aria-value": false,
    "require-parent-role": false,
    "tab-requires-tabpanel": false
  }
}
```

`markuplint:a11y` names these as `a11y/wai-aria/*` groups, so you can also disable `a11y/wai-aria/presentational-children` and the other group names.

`landmark-roles` and `required-h1` splits are in [Renames and splits](/docs/migration/v4-to-v5/rules/rule-names), not in the `wai-aria` alias.

## Terminology (custom rule authors)

ARIA 1.3 renames on `ARIARole` (old names remain `@deprecated` aliases):

| ARIA 1.3                          | Former                  |
| --------------------------------- | ----------------------- |
| `requiredAccessibilityParentRole` | `requiredContextRole`   |
| `allowedAccessibilityChildRoles`  | `requiredOwnedElements` |
