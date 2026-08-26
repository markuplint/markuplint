---
description: for、form、aria-*などに指定されたIDまたはIDのリストが、同じドキュメント内に存在するIDを参照しているかどうかを確認します。
---

# `no-refer-to-non-existent-id`

`for`、`form`、`aria-*` などに指定された**ID**または**IDのリスト**が、同じドキュメント内に存在するIDを参照しているかどうかを確認します。

ハイパーリンクの**フラグメント**(`<a href="#…">` / `<area href="#…">`)は[`no-broken-fragment-link`](/docs/rules/no-broken-fragment-link)の担当であり、このルールの対象ではありません — このルールが対象とする `DOMID` 型属性や ARIA の ID 参照とは異なり、HTML LS はフラグメントリンクの参照先不在を適合性違反として扱わないため、分割されています。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## ルールの詳細

❌ 間違ったコード例

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

✅ 正しいコード例

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
