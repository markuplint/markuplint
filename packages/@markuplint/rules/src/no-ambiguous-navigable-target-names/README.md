---
id: no-ambiguous-navigable-target-names
description: Prevents typographical errors in links and more that could inadvertently replace special navigational keywords (`_blank`, `_self`, `_parent`, `_top`) with invalid target names, ensuring navigations behave as intended.
---

# `no-ambiguous-navigable-target-names`

Prevents typographical errors in links and more that could inadvertently replace special navigational keywords (`_blank`, `_self`, `_parent`, `_top`) with invalid target names, ensuring navigations behave as intended.

<!-- prettier-ignore-end -->

❌ Examples of **incorrect** code for this rule

```html
<a href="path/to" target="blank">Link</a>

<iframe src="path/to" name="top"></iframe>
```

✅ Examples of **correct** code for this rule

```html
<a href="path/to" target="_blank">Link</a>
<a href="path/to" target="another-keyword">Link</a>

<iframe src="path/to" name="another-keyword"></iframe>
```
