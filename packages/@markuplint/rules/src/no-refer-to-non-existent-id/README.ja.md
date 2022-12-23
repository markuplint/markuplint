---
description: for、form、aria-*などに指定されたIDまたはIDのリストが、同じドキュメント内に存在するIDを参照しているかどうかを確認します。
---

# `no-refer-to-non-existent-id`

`for`、`form`、`aria-*` などに指定された**ID**または**IDのリスト** が、同じドキュメント内に存在するIDを参照しているかどうかを確認します。

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
