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

完全一致で判定します（グロブやワイルドカードパターンは使用できません）。

- `"dialog"` — `<dialog>` 要素を無視します（要素名の完全一致）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します

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
