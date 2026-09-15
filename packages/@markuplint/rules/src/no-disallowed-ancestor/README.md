---
id: no-disallowed-ancestor
description: Warns when an element appears as a descendant of an ancestor its content model forbids.
---

# `no-disallowed-ancestor`

Warns when an element appears as a descendant of an ancestor element its content model explicitly forbids (`forbiddenAncestors`), according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

Whether a child is allowed by the parent's own content model at all is [`permitted-contents`](/docs/rules/permitted-contents)'s concern, not this rule's — some elements are additionally forbidden from appearing anywhere further down the tree under a specific ancestor, not just as its direct child.

❌ Examples of **incorrect** code for this rule

```html
<address>
  <div>
    <address>Nested address</address>
  </div>
</address>
```

✅ Examples of **correct** code for this rule

```html
<address>Contact information</address>
```
