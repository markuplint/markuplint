---
id: no-contradictory-aria-prop
description: Warns when an ARIA property's value contradicts an equivalent native HTML attribute.
---

# `no-contradictory-aria-prop`

Warns when an ARIA property's value contradicts the current or implicit value of an equivalent native HTML attribute, per [ARIA in HTML §6](https://w3c.github.io/html-aria/#docconformance): native HTML attributes must take precedence over their ARIA equivalents.

Split out of the former `wai-aria-implicit-props` rule, alongside [`no-redundant-aria-prop`](/docs/rules/no-redundant-aria-prop). This half is `must`-level (`error`); the redundant half stays `should`-level (`warning`).

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" checked aria-checked="false" />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```
