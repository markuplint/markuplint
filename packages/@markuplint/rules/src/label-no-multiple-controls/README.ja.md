---
id: label-no-multiple-controls
description: HTML LS §4.10.4 が定める `label` 要素の子孫コントロール制約を強制します。
---

# `label-no-multiple-controls`

[HTML Living Standard §4.10.4 (the label element)](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) のコンテンツモデルは _「the label element's labeled control でない限り labelable な子孫は許可しない」_ と規定しています。ここから以下の2分岐が導かれます。

- `for` 属性が外部の labelable 要素を参照している場合、その外部要素が labeled control になるため、`<label>` 内部にフォームコントロールを含めてはなりません。
- それ以外の場合は、フォームコントロール（`button`, `input`, `meter`, `output`, `progress`, `select`, `textarea`）の子孫は最大1個まで。tree order で最初の要素が labeled control となります。

本ルールはこの両方の分岐を強制します。`for` が labelable でない要素を参照しているケースは [`label-for-references-labelable`](../label-for-references-labelable/) が、ID そのものが存在しないケースは [`no-refer-to-non-existent-id`](../no-refer-to-non-existent-id/) が担当します。a11y 寄りの相棒ルール [`label-has-control`](../label-has-control/) と組み合わせて運用してください。

❌ このルールに適合しない**誤った**コードの例

```html
<label>Name: <input type="text" name="first" /> <input type="text" name="last" /></label>
```

```html
<input id="username" /> <label for="username"><input /></label>
```

✅ このルールに適合する**正しい**コードの例

```html
<label>Name: <input type="text" name="full" /></label> <label for="meter1">Score:</label>
<meter id="meter1" value="3" max="10">3</meter>
```

```html
<input id="username" /> <label for="username">Username</label>
```
