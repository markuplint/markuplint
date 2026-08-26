---
id: no-duplicate-sibling-attr
description: Warns when an attribute that must be unique among siblings appears on more than one element of the same type within the same parent.
---

# `no-duplicate-sibling-attr`

Warns when an attribute the content model marks as sibling-unique (`uniqueAttrs`) appears on more than one element of the same type within the same parent, according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

❌ Examples of **incorrect** code for this rule

```html
<video>
  <track default src="a.vtt" />
  <track default src="b.vtt" />
</video>
```

✅ Examples of **correct** code for this rule

```html
<video>
  <track default src="a.vtt" />
  <track src="b.vtt" />
</video>
```
