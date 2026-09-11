---
id: label-for-references-labelable
description: '`label` 要素の `for` 属性は、実在するラベル付け可能要素の ID を参照しなければならないことを強制します。'
---

# `label-for-references-labelable`

[HTML Living Standard §4.10.4](https://html.spec.whatwg.org/multipage/forms.html#attr-label-for) によれば、`<label>` 要素の `for` 属性はラベル対象のコントロールを指すために用いられ、指定された場合、その値は同じツリー内の[ラベル付け可能要素](https://html.spec.whatwg.org/multipage/forms.html#category-label) — `button`、`input`（ただし `type="hidden"` を除く）、`meter`、`output`、`progress`、`select`、`textarea` — の ID でなければなりません。

ID の存在自体は [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) ルールが扱います。本ルールは ID が存在し、かつ参照先がラベル付け可能要素以外の場合にのみ発火します。

❌ このルールに適合しない**誤った**コードの例

```html
<label for="notaformcontrol">Label</label>
<div id="notaformcontrol">Just a div</div>
```

✅ このルールに適合する**正しい**コードの例

```html
<label for="username">Username</label> <input type="text" id="username" />
```
