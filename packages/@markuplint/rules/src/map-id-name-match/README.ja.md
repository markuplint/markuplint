---
id: map-id-name-match
description: map要素にidとnameの両方が指定されているとき、両者の値が一致することを要求します。
---

# `map-id-name-match`

[HTML Living Standard §4.8.13 (the map element)](https://html.spec.whatwg.org/multipage/image-maps.html#the-map-element) によれば、`<map>` 要素に `id` 属性と `name` 属性の両方が指定されている場合、それらの値は同じでなければなりません。

比較は **大文字小文字を区別** します。仕様の "same value" を strict string equality として解釈するため、`<map id="Foo" name="foo">` も検知されます。なお `<map>` の `name` 属性自体は `<img usemap>` とのマッチングでは case-insensitive ですが、これは本ルールとは別の仕様です。

❌ このルールに適合しない**誤った**コードの例

```html
<map id="foo" name="bar"><area href="a.html" alt="A" /></map>
```

✅ このルールに適合する**正しい**コードの例

```html
<map id="foo" name="foo"><area href="a.html" alt="A" /></map> <map name="foo"><area href="a.html" alt="A" /></map>
```
