---
id: element-supports-aria-prop
description: Warns when an ARIA property or state is disallowed by an element-specific ARIA in HTML restriction.
---

# `element-supports-aria-prop`

Warns when an `aria-*` attribute is disallowed by an element-specific restriction defined by [ARIA in HTML](https://w3c.github.io/html-aria/), regardless of the element's computed role:

1. **Element-specific prohibitions** — every `aria-*` attribute is forbidden on certain element states (e.g. `<input type="hidden">`), and individual attributes may be forbidden when another attribute is present or when the element sits in a specific parent context (e.g. `aria-expanded` on `<button popovertarget>` or `<button commandfor>` because the popover / Invoker Commands API manages the state automatically; `aria-expanded` and `aria-pressed` on the first `<summary>` inside `<details>` because the expanded state maps to the `open` attribute).
2. **Element-specific whitelist** — some elements accept only a small set of `aria-*` attributes (e.g. `<br>` and `<wbr>` accept only `aria-hidden`); any attribute outside the whitelist is rejected.

Split out of the former `wai-aria-disallowed-props` rule, alongside [`no-prohibited-naming`](/docs/rules/no-prohibited-naming) and [`role-supports-aria-prop`](/docs/rules/role-supports-aria-prop). The former rule's `disallowSetImplicitProps` option gated this check; disabling this rule entirely is how to opt out now.

❌ Examples of **incorrect** code for this rule

```html
<br aria-atomic="true" />
<input type="hidden" aria-hidden="true" />
<button popovertarget="p" aria-expanded="false">Toggle</button>
<button command="toggle-popover" commandfor="p" aria-expanded="false">Toggle</button>
<details>
  <summary aria-expanded="false">Summary</summary>
</details>
```

✅ Examples of **correct** code for this rule

```html
<br aria-hidden="true" />
<input type="hidden" />
<button popovertarget="p">Toggle</button>
<button command="toggle-popover" commandfor="p">Toggle</button>
<details>
  <summary>Summary</summary>
</details>
```
