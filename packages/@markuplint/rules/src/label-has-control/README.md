---
title: 'Label has control'
id: 'label-has-control'
category: 'a11y'
---

# Label has control

Warns if the label element has no control. This rule is used for finding unassociated labels that don't have original purposes.

And warns if there are controls after the first because only it can be associated with the label element.

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<label>foo</label><input type="text" />

<h1><label>New</label> Release Note</h1>
```

👍 Examples of **correct** code for this rule

```html
<label for="bar">foo</label><input type="text" id="bar" />

<label>foo<input type="text" /></label>

<h1><span>New</span> Release Note</h1>
```

## Default severity

`warning`
