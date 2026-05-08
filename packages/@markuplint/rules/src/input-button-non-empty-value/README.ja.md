---
id: input-button-non-empty-value
description: `<input type="button">` に value 属性を指定する場合、空文字列にしてはならないことを強制します。
---

# `input-button-non-empty-value`

[HTML Living Standard §4.10.5.1.21 (Button state)](<https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)>) では、`value` 属性をボタンのラベルとして利用すると規定されています。属性自体は省略可能（UA が既定ラベルを提供）ですが、明示的に `value=""` と空文字列を指定するのは避けるべきです。本ルールはこの「指定はされたが空文字列」のケースのみをエラーとし、属性が無いケースは対象外とします。

❌ このルールに適合しない**誤った**コードの例

```html
<input type="button" value="" />
```

✅ このルールに適合する**正しい**コードの例

```html
<input type="button" value="OK" /> <input type="button" />
```
