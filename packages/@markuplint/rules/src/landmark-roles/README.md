---
title: Landmark roles
id: landmark-roles
category: a11y
severity: warning
---

# Landmark roles

- ~~Whether perceptible content exists on any landmark~~ (Work in progress)
- Whether `banner`, `main`, `complementary` and `contentinfo` are top-level landmarks
- Whether a specific landmark roll has unique label when used multiple times on a page

Check the above and warn if it is not satisfied.

It is based on W3C [ARIA Landmarks Example](https://www.w3.org/TR/wai-aria-practices/examples/landmarks/).

👎 Examples of **incorrect** code for this rule

```html
<!DOCTYPE html>
<html>
  <body>
    <header>...</header>
    <nav>...</nav>
    <main>
      <header>...</header>
      <footer>...</footer>
      <nav>Duplicate navigation landmarks without a label</nav>
      <aside>Complementary landmark not at the top level</aside>
    </main>
    <footer>...</footer>
  </body>
</html>
```

👍 Examples of **correct** code for this rule

```html
<!DOCTYPE html>
<html>
  <body>
    <header>...</header>
    <nav aria-label="main">...</nav>
    <main>
      <header>...</header>
      <footer>...</footer>
      <nav aria-label="sub">...</nav>
    </main>
    <aside>...</aside>
    <footer>...</footer>
  </body>
</html>
```
