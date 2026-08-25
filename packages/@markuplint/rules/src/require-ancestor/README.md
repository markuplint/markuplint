---
id: require-ancestor
description: Warns when an element is missing a required ancestor.
---

# `require-ancestor`

Warns when an element appears without a required ancestor its content model specifies (`descendantOf`), according to the [HTML Living Standard](https://html.spec.whatwg.org/). It has settings in [`@markuplint/html-spec`](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src).

❌ Examples of **incorrect** code for this rule

```html
<div>
  <area href="/path" alt="Link" />
</div>
```

✅ Examples of **correct** code for this rule

```html
<map name="example">
  <area href="/path" alt="Link" />
</map>
```
