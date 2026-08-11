---
id: wai-aria-tab-requires-tabpanel
description: Warns when an active "tab" role element has no corresponding "tabpanel" role element.
---

# `wai-aria-tab-requires-tabpanel`

Warns when an active `tab` role element (`aria-selected="true"`) has no corresponding `tabpanel` role element.

This rule is part of the [`wai-aria`](../wai-aria/) rule family, split for granular severity control.

The correspondence is resolved via `aria-controls` on the tab (pointing to a `tabpanel`) or `aria-labelledby` on a `tabpanel` (pointing back at the tab's `id`).

❌ Examples of **incorrect** code for this rule

```html
<div role="tablist">
  <button role="tab" aria-selected="true">Tab</button>
</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel">Tab</button>
</div>
<div id="panel" role="tabpanel">Content</div>
```
