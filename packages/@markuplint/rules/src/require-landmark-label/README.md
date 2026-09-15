---
id: require-landmark-label
description: Warns when a landmark role used multiple times on a page lacks a unique accessible name.
---

# `require-landmark-label`

Warns when a landmark role (`banner`, `main`, `complementary`, `contentinfo`, `form`, `navigation`, or `region`) appears more than once in a document and an occurrence lacks a unique accessible name (`aria-label` or `aria-labelledby`), per [APG's Landmark Regions practice](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/).

Split out of the former `landmark-roles` rule, alongside [`no-nested-top-level-landmark`](/docs/rules/no-nested-top-level-landmark).

❌ Examples of **incorrect** code for this rule

```html
<!doctype html>
<html>
  <body>
    <nav>...</nav>
    <main>
      <nav>Duplicate navigation landmark without a label</nav>
    </main>
  </body>
</html>
```

✅ Examples of **correct** code for this rule

```html
<!doctype html>
<html>
  <body>
    <nav aria-label="main">...</nav>
    <main>
      <nav aria-label="sub">...</nav>
    </main>
  </body>
</html>
```
