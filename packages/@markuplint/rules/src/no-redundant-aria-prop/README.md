---
id: no-redundant-aria-prop
description: Warns when an ARIA property redundantly restates the same semantics as an equivalent native HTML attribute.
---

# `no-redundant-aria-prop`

Warns when an ARIA property has the same value as (or the same implicit default as) an equivalent native HTML attribute, per [ARIA in HTML §6](https://w3c.github.io/html-aria/#docconformance)'s recommendation to prefer the native attribute.

Split out of the former `wai-aria-implicit-props` rule, alongside [`no-contradictory-aria-prop`](/docs/rules/no-contradictory-aria-prop). This half stays `should`-level (`warning`); the contradicting half is `must`-level (`error`).

❌ Examples of **incorrect** code for this rule

```html
<input type="checkbox" checked aria-checked="true" />
```

✅ Examples of **correct** code for this rule

```html
<input type="checkbox" checked />
```
