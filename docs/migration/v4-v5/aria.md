# ARIA Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Config authors** who set ARIA version options
- **Custom rule authors** who access ARIA role or property information
- **Users** who lint ARIA attributes — the `wai-aria` umbrella rule is removed; see [Umbrella Rule Removed](#umbrella-rule-removed)

## Summary of Changes

| Change | Impact |
|--------|--------|
| ARIA 1.3 support added, now the default | New behaviors for all users unless `ariaVersion: "1.2"` is set |
| `generic` role becomes transparent in ARIA 1.3 | Content model validation |
| `image` / `img` role synonym in ARIA 1.3 | Permitted roles validation |
| `wai-aria` umbrella rule removed | Config files using `wai-aria` at all |
| `deprecated-element`/`no-unsupported-features`/`landmark-roles`/`required-h1` split; `input-button-non-empty-value` removed | See the per-rule migration guides in `rules/` and the [Rules (§4)](#rules-renamed-and-split) summary below |

## ARIA 1.3 Support

v5 adds ARIA 1.3 as a selectable version, **and changes the default from `"1.2"` to `"1.3"`**. Set `ariaVersion: "1.2"` explicitly if you need the previous behavior.

### How to Enable / Restore ARIA 1.2

Set `ariaVersion` globally via `ruleCommonSettings` (see [config migration guide](./config.md)):

```json
{
  "ruleCommonSettings": {
    "ariaVersion": "1.2"
  }
}
```

Only two rules also accept a per-rule `options.ariaVersion` override: `require-accessible-name` and `no-refer-to-non-existent-id`. Every other ARIA rule (the 21 successors of the former `wai-aria` umbrella) only reads `ruleCommonSettings.ariaVersion` — they have no per-rule version option of their own.

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

### v5 with ARIA 1.3 (now the default)

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
| `presentation` / `none` transparent for parent role | Yes | Yes |

## Image / IMG Role Synonym

In ARIA 1.3, `image` is the primary role name and `img` is a synonym. When either appears in an element's permitted roles, both are accepted. This affects elements whose permitted-roles list includes `img` — `<img>` itself isn't one of them, since its own implicit role is already `img`; `<embed>` and `<iframe>` are:

```html
<!-- ARIA 1.2: role="image" is not a permitted role for <embed> -->
<!-- ARIA 1.3: role="image" is accepted as a synonym of the permitted "img" -->
<embed src="chart.svg" role="image" />
```

## `<aside>` Conditional Role Mapping (ARIA 1.3)

`<aside>`'s implicit role is now conditional per ARIA 1.3: `complementary` when it's not a descendant of `<article>`/`<aside>`/`<blockquote>`/`<details>`/`<dialog>`/`<fieldset>`/`<figure>`/`<nav>`/`<section>`/`<td>`, `generic` when it is — unless the `<aside>` itself has an accessible name (e.g. `aria-label`), in which case it keeps `complementary`. `no-nested-top-level-landmark` (the rule split off from `landmark-roles`, see below) deliberately does not check `complementary` as a top-level landmark for this reason — its selector-based detection cannot tell a demoted `<aside>` apart from a true one, so checking it would produce false positives on any `<aside>` nested in one of those ancestors.

## Umbrella Rule Removed

In stable v4, `wai-aria` was a single rule that internally implemented around a dozen ARIA checks, each toggleable via a boolean option (`checkingDeprecatedRole`, `disallowSetImplicitProps`, `checkingRequiredOwnedElements`, etc.). During v5's alpha/rc development, those checks — and a few genuinely new ones — were carved out one at a time into independent rules (`no-abstract-role`, `no-unknown-role`, `require-owned-elements`, `no-focusable-in-aria-hidden`, and so on); by the time this final redesign started, 20 such rules already existed on their own, and `wai-aria` itself had shrunk to a thin option-toggle shim re-triggering them (its option names had also drifted by then — e.g. `checkingRequiredOwnedElements` had gained an alias `checkingAllowedAccessibilityChildRoles`). v5 removes that shim entirely, along with the option-toggle mechanism it alone consumed.

`wai-aria: v` still works — a deprecation warning is reported, and the config is expanded to all 21 successor rules (the 20 above, plus the new `no-aria-on-unsupported-element`) with the same severity/reason. The umbrella's per-check option toggles have no successor to route to: every one of these rules already ran its single check unconditionally once split off, and none of their schemas accept an `options` object — the toggles are simply dropped. To keep a check disabled that you previously turned off via an option, disable that specific rule instead:

```json
{
  "rules": {
    "no-redundant-role": false
  }
}
```

replaces the v4 pattern of disabling it via the umbrella's `disallowSetImplicitRole: false`.

### New Rule: `no-aria-on-unsupported-element`

The umbrella's very first check — disallowing `role`/`aria-*` on an element whose spec data marks it as not supporting ARIA attributes at all — had no independent successor rule until v5. It's now `no-aria-on-unsupported-element`.

### Removed: `input-button-non-empty-value`

This rule detected `<input type="button" value="">` as a proxy for "no accessible name," but it both over-reported (flagged buttons with an `aria-label`, which do have an accessible name) and under-reported (missed a missing `value` attribute entirely, which computes to the same empty accessible name). `require-accessible-name` already covers this case correctly and is removed in v5 in favor of it.

## Rules Renamed and Split

See [Rule Renames and Splits](./rule-names.md) for the full master reference across every v5 rule, not just ARIA ones.

Every rule previously prefixed `wai-aria-*` drops the prefix and is renamed to match the v5 naming convention (e.g. `wai-aria-non-existent-role` → `no-unknown-role`, `wai-aria-required-owned-elements` → `require-owned-elements`). Two of them are additionally split:

| Former rule | Split into |
|-------------|------------|
| `wai-aria-disallowed-props` | `no-prohibited-naming`, `element-supports-aria-prop`, `role-supports-aria-prop` |
| `wai-aria-implicit-props` | `no-redundant-aria-prop` (should-level, warning), `no-contradictory-aria-prop` (must-level, error) |

Two more ARIA-adjacent rules are also split:

- `landmark-roles` → `no-nested-top-level-landmark` (the `ignoreRoles` half) + `require-landmark-label` (the `labelEachArea` half — omitted from the expansion when the old config explicitly set `labelEachArea: false`)
- `required-h1` → `require-h1` (the missing-`<h1>` half) + `no-duplicate-h1` (the `expected-once` half — omitted from the expansion when the old config explicitly set `expected-once: false`). Both now default to `warning`: WCAG Technique H42, the closest cited basis for either check, is non-normative.

All old names keep working via a deprecation-warning alias until removed in v6.
