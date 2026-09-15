---
id: no-input-file-value
description: HTML LS §4.10.5.1.18 に従い、`<input type="file">` の value 属性は省略または空文字列のみ許容します。
---

# `no-input-file-value`

[HTML Living Standard §4.10.5.1.18 (File Upload state)](<https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)>) によれば、`<input type="file">` には空文字列以外の `value` 属性を指定できません。

> The `value` attribute, if specified, must have a value that is the empty string.

❌ このルールに適合しない**誤った**コードの例

```html
<input type="file" value="document.pdf" />
```

✅ このルールに適合する**正しい**コードの例

```html
<input type="file" /> <input type="file" value="" />
```
