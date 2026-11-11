---
id: require-accessible-name
description: Warn if the element has no accessible name.
---

# `require-accessible-name`

Warn if the element has no accessible name. It is according to its ARIA role whether name required.

Whether an element is hidden is judged along the accessibility tree, and the `label` that wraps a control is looked for in the tree of the control. The content of a `template` element is not rendered where it is written, and where it is inserted is not known from the markup, so an `aria-hidden` or a `hidden` outside of the `template` element does not hide the elements in its content, and a `label` outside of it does not name a control in it. That content is not the accessible name of an ancestor either. A declarative shadow root is rendered in its host when it is attached: the host can have one, and `shadowrootmode` is `open` or `closed`. Then what hides the host hides the elements in it, and the content is the host's name when the host takes its name from its content. A `template` that does not attach, such as one in a `button`, contributes nothing. When the markup does not say whether it attaches, the rule does not report the ancestor. A `slot` of that shadow root contributes the light children assigned to it by name (the `slot` attribute), or its own children when it has none; a light child that no `slot` takes is not part of the name. Where the assignment is not known (a `slot` outside of a shadow root or in a framework's component, manual slot assignment, or template syntax among the light children), the rule does not report.

❌ Examples of **incorrect** code for this rule

```html
<button>
  <span></span>
  <span></span>
  <span></span>
</button>
```

✅ Examples of **correct** code for this rule

```html
<button>
  <span class="visually-hidden">Menu</span>
  <span></span>
  <span></span>
  <span></span>
</button>
```
