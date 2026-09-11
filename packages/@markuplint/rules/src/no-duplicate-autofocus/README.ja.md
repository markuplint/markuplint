---
description: 同一のautofocusスコープ起点要素を共有する複数の要素にautofocus属性を指定することを禁止します。
---

# `no-duplicate-autofocus`

同一の[autofocusスコープ起点要素](https://html.spec.whatwg.org/multipage/interaction.html#nearest-ancestor-autofocus-scoping-root-element)を共有する複数の要素に`autofocus`属性を指定することを禁止します。[HTML Living Standard](https://html.spec.whatwg.org/multipage/interaction.html#the-autofocus-attribute)により、同じ直近の祖先autofocusスコープ起点要素を共有する2つ以上の要素に`autofocus`属性を指定してはなりません。

要素のスコープ起点は、その要素自身が`dialog`要素であるか`popover`属性を持つ場合はその要素自身、それ以外の場合は直近のそのような祖先要素、いずれも無ければ文書全体です。したがって2つの`dialog`要素や`popover`要素は、それぞれ独立して`autofocus`対象を持つことができます。

❌ 間違ったコード例

```html
<input autofocus /> <button autofocus>送信</button>
```

```html
<dialog>
  <input autofocus />
  <button autofocus>送信</button>
</dialog>
```

✅ 正しいコード例

```html
<input autofocus /> <button>送信</button>
```

```html
<dialog><input autofocus /></dialog>
<dialog><button autofocus>送信</button></dialog>
```
