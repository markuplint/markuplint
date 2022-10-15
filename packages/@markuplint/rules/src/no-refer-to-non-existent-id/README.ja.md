---
title: 存在しない ID への参照を禁止(no-refer-to-non-existent-id)
---

# 存在しない ID への参照を禁止(`no-refer-to-non-existent-id`)

`for`、`form`、`aria-*` などに指定された **ID** または **ID のリスト** が、同じドキュメント内に存在する ID を参照しているかどうかを確認します。

## ルールの詳細

👎 間違ったコード例

```html
<label for="foo">Text Field</label><input id="bar" type="text" />
```

👍 正しいコード例

```html
<label for="foo">Text Field</label><input id="foo" type="text" />
```

### 設定値

- 型: `boolean`
- デフォルト値: `true`

### オプション

##### `ariaVersion`

評価する WAI-ARIA のバージョンを指定します。

- 型: `"1.1" | "1.2"`
- 省略可
- 初期値: `1.2`

### デフォルトの警告の厳しさ

`error`
