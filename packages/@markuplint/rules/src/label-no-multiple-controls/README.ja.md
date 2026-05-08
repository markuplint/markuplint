---
id: label-no-multiple-controls
description: HTML LS §4.10.4 が定める「label要素の配下にフォームコントロール子孫は最大1個」というルールを強制します。
---

# `label-no-multiple-controls`

[HTML Living Standard §4.10.4 (the label element)](https://html.spec.whatwg.org/multipage/forms.html#the-label-element) によれば、`<label>` 要素はそのリスト（`button`, `input`, `meter`, `output`, `progress`, `select`, `textarea`）のうち最大1個までしか子孫として持てません。

本ルールはこの conformance を error として強制します。a11y 寄りのソフトな相棒ルール [`label-has-control`](../label-has-control/) と組み合わせて運用してください。

❌ このルールに適合しない**誤った**コードの例

```html
<label>Name: <input type="text" name="first" /> <input type="text" name="last" /></label>
```

✅ このルールに適合する**正しい**コードの例

```html
<label>Name: <input type="text" name="full" /></label> <label for="meter1">Score:</label>
<meter id="meter1" value="3" max="10">3</meter>
```
