---
id: no-refer-to-non-existent-id
description: Check whether the ID or the list of ID specified to for, form, aria-*, and more, or a fragment in a hyperlink are referencing it that existed in the same document.
---

# `no-refer-to-non-existent-id`

Check whether the **ID** or the **list of ID** specified to `for`, `form`, `aria-*`, and more, or a **fragment** in a hyperlink are referencing it that existed in the same document.

❌ Examples of **incorrect** code for this rule

```html
<label for="foo">Text Field</label><input id="bar" type="text" />

<a href="#baz">Fragment link</label>
<section id="qux">...</section>
```

✅ Examples of **correct** code for this rule

```html
<label for="foo">Text Field</label><input id="foo" type="text" />

<a href="#baz">Fragment link</label>
<section id="baz">...</section>
```
