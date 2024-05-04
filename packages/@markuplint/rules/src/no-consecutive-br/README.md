---
id: no-consecutive-br
description: Warns against the use of consecutive `<br>` tags
---

# `no-consecutive-br`

Warns against the use of consecutive `<br>` tags.

❌ Examples of **incorrect** code for this rule

```html
<p>
  A...<br />
  <br />
  B...
</p>
```

✅ Examples of **correct** code for this rule

```html
<p>A...</p>
<p>B...</p>
```
