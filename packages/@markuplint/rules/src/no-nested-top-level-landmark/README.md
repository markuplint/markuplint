---
id: no-nested-top-level-landmark
description: Warns when banner, main, or contentinfo is nested inside another landmark.
---

# `no-nested-top-level-landmark`

Warns when a `banner`, `main`, or `contentinfo` landmark is nested inside another landmark, per [APG's Landmark Regions practice](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/): these roles should be top-level landmarks.

Split out of the former `landmark-roles` rule, alongside [`require-landmark-label`](/docs/rules/require-landmark-label).

APG also requires `complementary` to be top-level, but this rule deliberately does not check it: `<aside>`'s implicit role is conditional under ARIA 1.3 (nested inside certain sectioning ancestors it demotes to `generic`, not `complementary`), and this rule's selector-based detection has no way to tell the two apart — see the [ARIA migration guide](/docs/migration/v4-to-v5/aria#aside-conditional-role-mapping-aria-13) for the history of that decision.

❌ Examples of **incorrect** code for this rule

```html
<!doctype html>
<html>
  <body>
    <header></header>
    <main>
      <main>Nested main landmark</main>
    </main>
  </body>
</html>
```

✅ Examples of **correct** code for this rule

```html
<!doctype html>
<html>
  <body>
    <header></header>
    <main>...</main>
    <aside>...</aside>
  </body>
</html>
```

## `ignoreRoles`

**Type:** `("banner" | "main" | "complementary" | "contentinfo" | "form" | "navigation" | "region")[]`
**Default:** `[]`

Excludes the specified landmark roles from the check. Only `banner`, `main`, and `contentinfo` have any effect, since those are the only roles this rule checks.
