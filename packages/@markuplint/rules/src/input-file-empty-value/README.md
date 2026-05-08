---
id: input-file-empty-value
description: Require <input type="file"> elements to omit the value attribute or set it to the empty string, per HTML LS §4.10.5.1.18.
---

# `input-file-empty-value`

Per [HTML Living Standard §4.10.5.1.18 (File Upload state)](<https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)>), `<input type="file">` may not carry a non-empty `value` attribute. The spec text reads:

> The `value` attribute, if specified, must have a value that is the empty string.

❌ Examples of **incorrect** code for this rule

```html
<input type="file" value="document.pdf" />
```

✅ Examples of **correct** code for this rule

```html
<input type="file" /> <input type="file" value="" />
```
