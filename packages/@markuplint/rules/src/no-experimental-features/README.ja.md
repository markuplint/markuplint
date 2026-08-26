---
description: 実験的とマークされたHTML要素や属性を使用している場合に警告します。
---

# `no-experimental-features`

markuplint にバンドルされたHTML仕様データで**実験的（experimental）**とマークされた要素・属性について警告します。

:::info

旧 `no-unsupported-features` ルールの `checkExperimental` オプション(#3989)から分割されました。このルールを有効にすることは旧来の `checkExperimental: true` と等価です。browserslist によるブラウザサポートチェックには[`no-unsupported-browser-features`](../no-unsupported-browser-features/)ルールを、非標準な機能には[`no-nonstandard-features`](../no-nonstandard-features/)ルールを使用してください。

:::

> **注意:** 要素や属性が実験的かどうかは、markuplint にバンドルされたHTML仕様データに依存します。機能が実験的でなくなった場合、このルールは報告しません。

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
<iframe credentialless></iframe>
```

✅ 正しいコード例

```html
<iframe></iframe>
```

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->
