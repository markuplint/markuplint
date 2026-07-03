---
id: input-list-references-datalist
description: `input` 要素の `list` 属性は、実在する `datalist` 要素の ID を参照しなければならないことを強制します。
---

# `input-list-references-datalist`

[HTML Living Standard §4.10.5.2](https://html.spec.whatwg.org/multipage/input.html#the-list-attribute) によれば、`<input>` 要素の `list` 属性はユーザーへ提示する候補一覧を持つ要素を指すために用いられ、指定された場合、その値は同じツリー内の `<datalist>` 要素の ID でなければなりません。

ID の存在自体は [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) ルールが扱います。本ルールは ID が存在し、かつ参照先が `<datalist>` 以外の要素の場合にのみ発火します。

❌ このルールに適合しない**誤った**コードの例

```html
<input type="text" list="notdatalist" />
<div id="notdatalist">Not a datalist</div>
```

✅ このルールに適合する**正しい**コードの例

```html
<input type="text" list="colors" />
<datalist id="colors">
  <option value="Red"></option>
  <option value="Green"></option>
  <option value="Blue"></option>
</datalist>
```
