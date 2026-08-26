---
id: no-refer-to-non-existent-id
description: Check whether the ID or the list of ID specified to for, form, aria-*, and more are referencing an ID that exists in the same document.
---

# `no-refer-to-non-existent-id`

Check whether the **ID** or the **list of ID** specified to `for`, `form`, `aria-*`, and more are referencing an ID that exists in the same document.

A hyperlink **fragment** (`<a href="#…">` / `<area href="#…">`) is [`no-broken-fragment-link`](/docs/rules/no-broken-fragment-link)'s concern, not this rule's — split out because HTML LS does not treat a broken fragment link as a conformance violation, unlike the `DOMID`-typed attributes and ARIA ID references this rule covers.

❌ Examples of **incorrect** code for this rule

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

✅ Examples of **correct** code for this rule

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```
