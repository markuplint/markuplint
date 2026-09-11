---
id: no-extra-selected-options
description: multiple属性を持たないselect要素の配下に、selected属性付きoption要素が複数ある状態を禁じます。
---

# `no-extra-selected-options`

[HTML Living Standard §4.10.7 (the select element)](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element) では、`multiple` 属性を持たない `<select>` の "list of options" のうち `selected` 属性が付いている `<option>` は最大1個までと定められています。

ここでの "list of options" は、`<select>` の直接の `<option>` 子要素と、`<optgroup>` 子要素配下の `<option>` 要素のことです。

❌ このルールに適合しない**誤った**コードの例

```html
<select>
  <option selected>One</option>
  <option selected>Two</option>
</select>
```

✅ このルールに適合する**正しい**コードの例

```html
<select>
  <option selected>One</option>
  <option>Two</option>
</select>
<select multiple>
  <option selected>One</option>
  <option selected>Two</option>
</select>
```
