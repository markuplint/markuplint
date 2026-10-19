---
description: 非標準とマークされたHTML要素や属性を使用している場合に警告します。
---

# `no-nonstandard-features`

markuplint にバンドルされたHTML仕様データで**非標準（non-standard）**とマークされた要素・属性について警告します。

:::info

旧 `no-unsupported-features` ルールの `checkNonStandard` オプション(#3989)から分割されました。このルールを有効にすることは旧来の `checkNonStandard: true` と等価です。browserslist によるブラウザサポートチェックには[`no-unsupported-browser-features`](../no-unsupported-browser-features/)ルールを、実験的な機能には[`no-experimental-features`](../no-experimental-features/)ルールを使用してください。

:::

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

## デフォルトの深刻度

`warning`

## オプション

| オプション       | 型         | デフォルト | 説明         |
| ---------------- | ---------- | ---------- | ------------ |
| `ignoreFeatures` | `string[]` | `[]`       | 無視する機能 |

### `ignoreFeatures` の形式

完全一致で判定します（グロブやワイルドカードパターンは使用できません）。ただし、英字の大文字・小文字はソースコードでの扱いに合わせて比較します。

- `"dialog"` — `<dialog>` 要素を無視します。要素名はドキュメントがタグ名を比較する方法で比較します。HTMLではASCIIの大文字・小文字を区別せず、タグ名の大文字・小文字を区別する構文（JSX、Svelte）では完全一致です（`DIALOG` は `<dialog>` ではありません）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します。属性名は、検査中の属性についてDOMが比較する方法で比較します。`LIST` は、HTMLでは同じ属性で、JSXやSvelteのHTML要素でも同じ属性ですが、JSXが設定する `<svg>` 要素では同じ綴りだけが同じ属性です

## 使用例

❌ 間違ったコード例

```html
<canvas moz-opaque></canvas>
```

✅ 正しいコード例

```html
<canvas></canvas>
```

## `deprecated-element` からの移行

v4.x の `deprecated-element` ルールは非推奨（deprecated）、廃止（obsolete）、非標準（non-standard）の3種類を検出していました。v5.x では非標準の検出はこのルールに移管されました。

```json
{
  "rules": {
    "no-nonstandard-features": true
  }
}
```

`recommended` プリセットを使用している場合は、`compat` プリセット経由で自動的に有効になっているため変更は不要です。

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
