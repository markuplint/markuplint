---
description: for、form、aria-*などに指定されたIDまたはIDのリストが、もしくはハイパーリンクに指定されたフラグメントが、同じドキュメント内に存在するIDを参照しているかどうかを確認します。
---

# `no-refer-to-non-existent-id`

`for`、`form`、`aria-*` などに指定された**ID**または**IDのリスト**が、もしくはハイパーリンクに指定されたフラグメントが、同じドキュメント内に存在するIDを参照しているかどうかを確認します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## ルールの詳細

❌ 間違ったコード例

```html
<label for="foo">Text Field</label><input id="bar" type="text" />

<a href="#baz">Fragment link</label>
<section id="qux">...</section>
```

✅ 正しいコード例

```html
<label for="foo">Text Field</label><input id="foo" type="text" />

<a href="#baz">Fragment link</label>
<section id="baz">...</section>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
