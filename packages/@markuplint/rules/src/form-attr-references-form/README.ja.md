---
id: form-attr-references-form
description: フォーム関連要素の `form` 属性は、実在する form 要素の ID を参照しなければならないことを強制します。
---

# `form-attr-references-form`

[HTML Living Standard §4.10.18.6](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fae-form) によれば、フォーム関連要素 (`button`, `fieldset`, `input`, `label`, `meter`, `object`, `output`, `progress`, `select`, `textarea`) の `form` 属性は、指定された場合、ツリー内の `<form>` 要素の ID でなければなりません。

ID の存在自体は [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) ルールが扱います。本ルールは ID が存在し、かつ参照先が `<form>` 以外の要素の場合にのみ発火します。

❌ このルールに適合しない**誤った**コードの例

```html
<div id="notaform">Not a form</div>
<input type="text" form="notaform" />
```

✅ このルールに適合する**正しい**コードの例

```html
<form id="myform"><!-- ... --></form>
<input type="text" form="myform" />
```
