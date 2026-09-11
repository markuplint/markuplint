---
description: ターゲットブラウザでサポートされていないHTML要素や属性を使用している場合に警告します。
---

# `no-unsupported-browser-features`

プロジェクトのターゲットブラウザ（[browserslist](https://github.com/browserslist/browserslist) 経由）で**サポートされていない** HTML要素や属性を使用している場合に警告します。

このルールはブラウザサポートの確認に [@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) を使用しています。

:::info

旧 `no-unsupported-features` ルール(#3989)から分割されました。旧ルールは実験的・非標準の機能検出も兼ねていました。実験的な要素・属性には[`no-experimental-features`](../no-experimental-features/)ルールを、非標準な要素・属性には[`no-nonstandard-features`](../no-nonstandard-features/)ルールを使用してください。

:::

> **注意:** プロジェクトに browserslist 設定がない場合、このルールは何も行いません（no-op）。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## デフォルトの深刻度

`warning`

## 動作の仕組み

プロジェクトの browserslist 設定を読み取り、各HTML要素・属性がすべてのターゲットブラウザでサポートされているか確認します。かつてサポートされていたがその後ブラウザから削除された機能も報告されます（例: "removed in 50"）。

## オプション

| オプション           | 型                   | デフォルト | 説明                                      |
| -------------------- | -------------------- | ---------- | ----------------------------------------- |
| `browserslist`       | `string \| string[]` | -          | browserslist クエリの上書き               |
| `browserslistConfig` | `string`             | -          | browserslist 設定ファイルへの明示パス     |
| `browserslistEnv`    | `string`             | -          | browserslist 環境名（例: `"production"`） |
| `ignoreFeatures`     | `string[]`           | `[]`       | 無視する機能                              |

### `ignoreFeatures` の形式

完全一致で判定します（グロブやワイルドカードパターンは使用できません）。

- `"dialog"` — `<dialog>` 要素を無視します（要素名の完全一致）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します

## 使用例

設定:

```json
{
  "rules": {
    "no-unsupported-browser-features": {
      "options": {
        "browserslist": "ie 11"
      }
    }
  }
}
```

❌ 間違ったコード例

```html
<dialog>ダイアログです</dialog>
```

✅ 正しいコード例

```html
<div>コンテンツです</div>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
