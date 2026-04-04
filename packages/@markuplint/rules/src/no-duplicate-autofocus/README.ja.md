---
description: ドキュメント内で複数の要素にautofocus属性を指定することを禁止します。
---

# `no-duplicate-autofocus`

ドキュメント内で複数の要素に`autofocus`属性を指定することを禁止します。[HTML Living Standard](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute)により、同一ドキュメント内で2つ以上の要素に`autofocus`属性を指定してはなりません。

❌ 間違ったコード例

```html
<input autofocus /> <button autofocus>送信</button>
```

✅ 正しいコード例

```html
<input autofocus /> <button>送信</button>
```
