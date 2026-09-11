---
id: role-supports-aria-prop
description: Warns when an ARIA property or state is disallowed on the element's computed role.
---

# `role-supports-aria-prop`

Warns when an ARIA property or state is not in the [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/) role definition's set of supported states and properties for the element's computed role — e.g. `aria-pressed` on `role="heading"`.

Split out of the former `wai-aria-disallowed-props` rule, alongside [`no-prohibited-naming`](/docs/rules/no-prohibited-naming) and [`element-supports-aria-prop`](/docs/rules/element-supports-aria-prop).

❌ Examples of **incorrect** code for this rule

```html
<div role="heading" aria-pressed="true"></div>
```

✅ Examples of **correct** code for this rule

```html
<div role="button" aria-pressed="true"></div>
```
