---
description: ターゲットブラウザでサポートされていないHTML要素や属性、実験的・非標準な要素・属性を使用している場合に警告します。
---

# `no-unsupported-features`

プロジェクトのターゲットブラウザ（[browserslist](https://github.com/browserslist/browserslist) 経由）で**サポートされていない** HTML要素や属性、または**実験的（experimental）**・**非標準（non-standard）**な要素・属性を使用している場合に警告します。

このルールはブラウザサポートの確認に [@mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) を、実験的・非標準フラグの確認にビルトインのHTML仕様データを使用しています。

> **注意:** プロジェクトに browserslist 設定がない場合、ブラウザサポートチェックは何も行いません（no-op）。`checkExperimental` と `checkNonStandard` オプションは browserslist 設定がなくても動作します。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## デフォルトの深刻度

`warning`

## 動作の仕組み

1. **ブラウザサポートチェック**: プロジェクトの browserslist 設定を読み取り、各HTML要素・属性がすべてのターゲットブラウザでサポートされているか確認します。
2. **実験的チェック** (`checkExperimental`): HTML仕様で実験的とマークされた要素・属性について警告します。
3. **非標準チェック** (`checkNonStandard`): HTML仕様で非標準とマークされた要素・属性について警告します。

## オプション

| オプション           | 型                   | デフォルト | 説明                                      |
| -------------------- | -------------------- | ---------- | ----------------------------------------- |
| `browserslist`       | `string \| string[]` | -          | browserslist クエリの上書き               |
| `browserslistConfig` | `string`             | -          | browserslist 設定ファイルへの明示パス     |
| `browserslistEnv`    | `string`             | -          | browserslist 環境名（例: `"production"`） |
| `ignoreFeatures`     | `string[]`           | `[]`       | 無視する機能                              |
| `checkExperimental`  | `boolean`            | `false`    | 実験的な要素・属性を警告する              |
| `checkNonStandard`   | `boolean`            | `false`    | 非標準な要素・属性を警告する              |

### `ignoreFeatures` の形式

- `"dialog"` — `<dialog>` 要素を無視します（要素名の完全一致）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します

## 使用例

### ブラウザサポートチェック

設定:

```json
{
  "rules": {
    "no-unsupported-features": {
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

### 非標準チェック

設定:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

❌ 間違ったコード例

```html
<canvas moz-opaque></canvas>
```

✅ 正しいコード例

```html
<canvas></canvas>
```

## `deprecated-element` からの移行

v4.x の `deprecated-element` ルールは非推奨（deprecated）、廃止（obsolete）、非標準（non-standard）の3種類を検出していました。
v5.x では非標準の検出は `no-unsupported-features` ルールの `checkNonStandard` オプションに移管されました。

### 移行前 (v4.x)

`deprecated-element` が非標準要素を自動で検出

### 移行後 (v5.x)

非標準要素の検出には `no-unsupported-features` ルールを有効にしてください:

```json
{
  "rules": {
    "no-unsupported-features": {
      "options": {
        "checkNonStandard": true
      }
    }
  }
}
```

`recommended` プリセットを使用している場合は、自動的に有効になっているため変更は不要です。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
