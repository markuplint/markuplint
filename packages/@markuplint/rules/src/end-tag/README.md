---
id: end-tag
description: Warn if there is not an end tag.
---

# `end-tag`

Warn if there is not an end tag. It doesn't warn if a tag has self-closing solidus and doesn't need the end tag, or the tag is a void element.

:::note

Currently, this rule doesn't evaluate whether omit possible the end tag.

:::

❌ Examples of **incorrect** code for this rule

```html
<div>
  <span>There is not an end tag.
</div>
```

✅ Examples of **correct** code for this rule

```html
<div>
  <span>There is an end tag.</span>
</div>
```
