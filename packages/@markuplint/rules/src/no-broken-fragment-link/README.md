---
id: no-broken-fragment-link
description: Check whether a fragment in a hyperlink is referencing an ID that exists in the same document.
---

# `no-broken-fragment-link`

Check whether a **fragment** in a hyperlink (`<a href="#…">` / `<area href="#…">`) is referencing an ID that exists in the same document, per [HTML Living Standard § Scrolling to a fragment](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scrolling-to-a-fragment).

Split out of the former `no-refer-to-non-existent-id` rule. HTML LS does not treat a broken fragment link as a conformance violation — scrolling to a fragment simply does nothing when its target is absent — so this rule's default severity is `warning` rather than [`no-refer-to-non-existent-id`](/docs/rules/no-refer-to-non-existent-id)'s `error`.

The `fragmentRefersNameAttr` option additionally accepts a fragment that matches an element's `name` attribute value, not just an `id`.

❌ Examples of **incorrect** code for this rule

```html
<a href="#baz">Fragment link</a>
<section id="qux">...</section>
```

✅ Examples of **correct** code for this rule

```html
<a href="#baz">Fragment link</a>
<section id="baz">...</section>
```
