---
description: for、form、aria-*などに指定されたIDまたはIDのリストが、同じツリー内に存在するIDを参照しているかどうかを確認します。
---

# `no-refer-to-non-existent-id`

`for`、`form`、`aria-*` などに指定された**ID**または**IDのリスト**が、同じツリー内に存在するIDを参照しているかどうかを確認します。ドキュメントは1つのツリーで、`template`要素の内容は独立したツリー、宣言的シャドウルートも同様なので、参照は別のツリーのIDには届きません。参照は、マークアップ中の文字参照を解決したうえでIDと比較します。宣言的シャドウルートが付与される`template`要素はどのツリーにも属さず何も参照しません。付与されるかもしれない`template`要素(親がファイルの中にない、または親がコンポーネント、あるいは`shadowrootmode`が動的な値)も同様で、わからないものは報告しないためです。ReactとVueでは、ディレクティブのない`template`要素の子要素はドキュメントのツリーにあります。

ハイパーリンクの**フラグメント**(`<a href="#…">` / `<area href="#…">`)は[`no-broken-fragment-link`](/docs/rules/no-broken-fragment-link)の担当であり、このルールの対象ではありません — このルールが対象とする `DOMID` 型属性や ARIA の ID 参照とは異なり、HTML LS はフラグメントリンクの参照先不在を適合性違反として扱わないため、分割されています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

✅ 正しいコード例

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
