---
id: no-duplicate-aria-owns
description: Disallows referring to an element from the `aria-owns` of more than one element.
---

# `no-duplicate-aria-owns`

Disallows referring to an element from the `aria-owns` of more than one element.

> Authors MUST ensure that an element's ID is not specified in more than one other element's aria-owns attribute at any time. In other words, an element can have only one explicit owner.

Cite: [WAI-ARIA aria-owns property](https://w3c.github.io/aria/#aria-owns)

Every `aria-owns` after the first one in document order that lists an ID is reported. An ID is looked for in the tree of the `aria-owns`: the content of a `template` element and a declarative shadow root are trees of their own. An ID that no element has is reported by [`no-refer-to-non-existent-id`](/docs/rules/no-refer-to-non-existent-id), and an element that lists its own ID by [`no-circular-aria-owns`](/docs/rules/no-circular-aria-owns). A document with a block of template syntax, and an `aria-owns` whose value is not known until it is rendered, are not judged.

❌ Examples of **incorrect** code for this rule

```html
<div role="listbox" aria-owns="option1"></div>
<div role="listbox" aria-owns="option1"></div>
<div id="option1" role="option">Apple</div>
```

✅ Examples of **correct** code for this rule

```html
<div role="listbox" aria-owns="option1"></div>
<div role="listbox" aria-owns="option2"></div>
<div id="option1" role="option">Apple</div>
<div id="option2" role="option">Orange</div>
```
