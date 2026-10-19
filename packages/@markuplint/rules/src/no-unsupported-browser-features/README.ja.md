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

完全一致で判定します（グロブやワイルドカードパターンは使用できません）。ただし、英字の大文字・小文字は次のように比較します。要素の部分は、その言語のタグ名と同じ方法で比較します。パーサーがタグ名の大文字・小文字を区別する構文（JSX、Svelte、Astro、MDX）では区別し、それ以外ではASCIIの大文字・小文字を区別しません。属性の部分は、その属性の名前をDOMが比較する方法で比較します（[属性名の大文字・小文字](/docs/rules/no-unknown-attr#attribute-name-case)を参照）。

- `"dialog"` — `<dialog>` 要素を無視します。要素名はドキュメントがタグ名を比較する方法で比較します。HTMLではASCIIの大文字・小文字を区別せず、タグ名の大文字・小文字を区別する構文（JSX、Svelte）では完全一致です（`DIALOG` は `<dialog>` ではありません）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します。属性名は、検査中の属性についてDOMが比較する方法で比較します。`LIST` は、HTMLでは同じ属性で、JSXやSvelteのHTML要素でも同じ属性ですが、JSXが設定する `<svg>` 要素では同じ綴りだけが同じ属性です

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
