---
id: no-input-file-value
description: Reports a non-empty value attribute on `<input type="file">`. Superseded by no-disallowed-attr, which reports the attribute whatever its value.
---

# `no-input-file-value`

Reports a non-empty `value` attribute on `<input type="file">`.

:::caution
This rule is superseded by [`no-disallowed-attr`](/docs/rules/no-disallowed-attr). The HTML Living Standard does not allow a `value` attribute on `<input type="file">` at all, an empty one included. `no-disallowed-attr` reports every such attribute, while this rule reports only a non-empty one. The rule stays for configurations that name it and will be removed in v6.
:::

> The element's `value` attribute must be omitted.

Cite: [HTML Living Standard 4.10.5.1.17 File Upload state](<https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)>)

❌ Examples of **incorrect** code for this rule

```html
<input type="file" value="document.pdf" />
```

✅ Examples of **correct** code for this rule

```html
<input type="file" />
```
