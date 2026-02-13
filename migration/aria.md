# ARIA 1.3 Migration Guide

This document describes behavioral changes introduced by ARIA 1.3 support in `@markuplint/ml-spec`. All changes are **version-gated** — existing behavior under `ARIAVersion '1.1'` or `'1.2'` is unchanged.

## Generic Role Transparency

The most significant change in ARIA 1.3 is that elements with the `generic` role (including bare `<div>` and `<span>`) become **transparent** during accessibility tree ownership traversal.

### Background

In ARIA 1.2, the concept of "owned element" did not clearly define whether intermediate `generic` elements should be traversed. A `<div>` wrapper between a `<ul>` and its `<li>` children broke the parent-child role relationship:

```html
<!-- ARIA 1.2: <li> does NOT satisfy the "Required Owned Elements" constraint of <ul> -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

ARIA 1.3 introduces formal definitions of **"accessibility child"** and **"accessibility parent"**, stating:

> User agents MUST ignore any intervening elements with the role `generic` or `none`.

### Affected Functions

#### `isTransparentForOwnership(roleName, version)` — NEW

A new predicate that centralizes the transparency logic.

| ARIA Version | Transparent roles                  |
| ------------ | ---------------------------------- |
| `'1.1'`, `'1.2'` | `presentation`, `none`        |
| `'1.3'`      | `presentation`, `none`, `generic` |

**Source:** `src/algorithm/aria/is-presentational.ts`

#### `matchesContextRole` — Required Accessibility Parent Role

In ARIA 1.3, parent elements with `generic` or `none` roles are skipped when validating the "Required Accessibility Parent Role" (called "Required Context Role" in ARIA 1.2).

```html
<!-- ARIA 1.2: FAILS — <div> blocks the list > listitem relationship -->
<!-- ARIA 1.3: PASSES — <div> (generic) is transparent -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

**Source:** `src/algorithm/aria/matches-context-role.ts`

#### `hasRequiredOwnedElement` / `getClosestNonPresentationalDescendants` — Allowed Accessibility Child Roles

In ARIA 1.3, `generic` elements are transparent when traversing descendants to validate "Allowed Accessibility Child Roles" (called "Required Owned Elements" in ARIA 1.2).

```html
<!-- ARIA 1.2: FAILS — <div> blocks the list > listitem ownership -->
<!-- ARIA 1.3: PASSES — <div> (generic) is transparent -->
<ul>
  <div>
    <li>item</li>
  </div>
</ul>
```

Nested wrappers are also traversed:

```html
<!-- ARIA 1.3: PASSES — both <div> wrappers are transparent -->
<ul>
  <div>
    <div>
      <li>item</li>
    </div>
  </div>
</ul>
```

**Source:** `src/algorithm/aria/has-required-owned-elements.ts`

#### `getNonPresentationalAncestor` — Ancestor Traversal

Skips `generic` role elements when searching for the nearest non-presentational ancestor. This affects the Presentational Roles Conflict Resolution algorithm.

```html
<!-- ARIA 1.2: <li role="presentation"> keeps its presentational role
     because <div> is NOT transparent and blocks the ancestor search -->
<!-- ARIA 1.3: <li role="presentation"> is overridden to "listitem"
     because <div> IS transparent, <ul> is found as the ancestor,
     and the listitem matches a required owned element -->
<ul>
  <div>
    <li role="presentation">item</li>
  </div>
</ul>
```

**Source:** `src/algorithm/aria/get-non-presentational-ancestor.ts`

### Impact on Rule `wai-aria`

The `required-owned-elements` checking in `@markuplint/rules` now respects this transparency. When a user sets `ARIAVersion` to `'1.3'`, generic `<div>` wrappers no longer trigger "Required Owned Elements" violations.

## Image / IMG Role Synonym

In ARIA 1.3, the `image` role is the primary name and `img` is defined as a synonym.

### Permitted Roles

When either `image` or `img` appears in an element's permitted roles, both are automatically included:

```html
<!-- ARIA 1.2: permitted roles include only "img" -->
<!-- ARIA 1.3: permitted roles include both "image" and "img" -->
<img alt="photo" />
```

**Source:** `src/algorithm/aria/get-aria.ts` (`optimizePermittedRoles`), `src/algorithm/aria/get-permitted-roles-spec.ts`

### Implicit Role

When an element's implicit role is `img` or `image` in ARIA 1.3, the implicit role list includes both synonyms:

```ts
// ARIA 1.2
getPermittedRoles(specs, 'img', null, '1.2', matches);
// → [{ name: 'img' }, ...]

// ARIA 1.3
getPermittedRoles(specs, 'img', null, '1.3', matches);
// → [{ name: 'image' }, { name: 'img' }, ...]
```

## Terminology and Property Name Changes

ARIA 1.3 renames several concepts. The `ARIARole` type now exposes **both** the new ARIA 1.3 property names and the deprecated ARIA 1.2 names for backward compatibility:

| ARIA 1.3 property (new)                     | ARIA 1.2 property (deprecated)   |
| -------------------------------------------- | -------------------------------- |
| `requiredAccessibilityParentRole`            | `requiredContextRole`            |
| `allowedAccessibilityChildRoles`             | `requiredOwnedElements`          |

Both properties hold the same values. Internal code uses the new names; the old names are retained as `@deprecated` aliases.

### Rule Option Rename

The `wai-aria` rule option has also been renamed:

| ARIA 1.3 option (new)                         | ARIA 1.2 option (deprecated)      |
| ----------------------------------------------- | --------------------------------- |
| `checkingAllowedAccessibilityChildRoles`       | `checkingRequiredOwnedElements`   |

Both options default to `true`. The check runs only when **both** are `true`, so setting either to `false` disables it. This ensures backward compatibility — existing configs that set `checkingRequiredOwnedElements: false` continue to work.

## Version Gating Summary

All ARIA 1.3 behaviors are gated by the `version` parameter:

| Behavior                              | `'1.1'` / `'1.2'` | `'1.3'`      |
| ------------------------------------- | ------------------- | ------------ |
| `generic` transparent for ownership   | No                  | Yes          |
| `generic` transparent for context role | No                 | Yes          |
| `image` / `img` synonym              | No                  | Yes          |
| `presentation` / `none` transparent   | Yes                 | Yes          |

The `wai-aria` rule's `version` option now accepts `'1.3'` in addition to `'1.1'` and `'1.2'`. The default remains `'1.2'`, so existing users will see no behavioral differences.
