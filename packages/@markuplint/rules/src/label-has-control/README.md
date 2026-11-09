---
id: label-has-control
description: Warns if the label element has no control.
---

# `label-has-control`

Warns if the label element has no control. This rule is used for finding unassociated labels that don't have original purposes.

:::note

An excess of descendant controls after the first is `label-no-multiple-controls`'s responsibility, not this rule's — that rule also accounts for the case where `for` references an external labelable element.

An element that one branch of a conditional block renders counts as a descendant of the label, the same as a direct child: any element is enough, not only a labelable control. The block itself is not an element.

:::

❌ Examples of **incorrect** code for this rule

```html
<label>foo</label><input type="text" />

<h1><label>New</label> Release Note</h1>
```

✅ Examples of **correct** code for this rule

```html
<label for="bar">foo</label><input type="text" id="bar" />

<label>foo<input type="text" /></label>

<h1><span>New</span> Release Note</h1>
```
