---
id: input-button-non-empty-value
description: `<input type="button">` に value 属性を指定する場合、空文字列にしてはならないことを強制します。
---

# `input-button-non-empty-value`

`<input type="button">` に `value=""` を書くことを禁じます。HTML Living Standard の [Button state §4.10.5.1.21](<https://html.spec.whatwg.org/multipage/input.html#button-state-(type=button)>) は「UA が value 属性をボタンのラベルとして表示する／省略時は UA 既定ラベルを使う」とだけ規定しており、明示的な「空文字列にしてはならない」という文言は仕様書には存在しません。「空文字列を許容しない」というアサートは [nu-validator の schematron-equiv assertions](https://github.com/validator/validator/blob/main/src/nu/validator/checker/schematronequiv/Assertions.java) にハードコードされたもので（`must have non-empty attribute "value"` を検索）、nu はこれをエラーとして報告します。本ルールはこの conformance シグナルを踏襲しつつ保守的に振る舞います — `value=""` のように明示的に空文字列が指定されたケースのみ検査し、value 自体を省略したケースは仕様通り問題なしとして扱います。

❌ このルールに適合しない**誤った**コードの例

```html
<input type="button" value="" />
```

✅ このルールに適合する**正しい**コードの例

```html
<input type="button" value="OK" /> <input type="button" />
```
