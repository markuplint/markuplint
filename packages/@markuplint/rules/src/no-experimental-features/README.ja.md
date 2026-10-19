---
description: 実験的とマークされたHTML要素や属性を使用している場合に警告します。
---

# `no-experimental-features`

markuplint にバンドルされたHTML仕様データで**実験的（experimental）**とマークされた要素・属性について警告します。

:::info

旧 `no-unsupported-features` ルールの `checkExperimental` オプション(#3989)から分割されました。このルールを有効にすることは旧来の `checkExperimental: true` と等価です。browserslist によるブラウザサポートチェックには[`no-unsupported-browser-features`](../no-unsupported-browser-features/)ルールを、非標準な機能には[`no-nonstandard-features`](../no-nonstandard-features/)ルールを使用してください。

どのプリセットにも含まれません: `checkExperimental` のデフォルトは `false` で、設定が明示的に要求しない限りこの検査は動きませんでした。ルールの有効化も同じく明示的なオプトインのままです。姉妹ルールの2件はどちらも `markuplint:compat` に入っています。

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

完全一致で判定します（グロブやワイルドカードパターンは使用できません）。ただし、英字の大文字・小文字は次のように比較します。要素の部分は、その言語のタグ名と同じ方法で比較します。パーサーがタグ名の大文字・小文字を区別する構文（JSX、Svelte、Astro、MDX）では区別し、それ以外ではASCIIの大文字・小文字を区別しません。属性の部分は、その属性の名前をDOMが比較する方法で比較します（[属性名の大文字・小文字](/docs/rules/no-unknown-attr#attribute-name-case)を参照）。

- `"dialog"` — `<dialog>` 要素を無視します。要素名はドキュメントがタグ名を比較する方法で比較します。HTMLではASCIIの大文字・小文字を区別せず、タグ名の大文字・小文字を区別する構文（JSX、Svelte）では完全一致です（`DIALOG` は `<dialog>` ではありません）
- `"input[list]"` — `<input>` 要素の `list` 属性を無視します。属性名は、検査中の属性についてDOMが比較する方法で比較します。`LIST` は、HTMLでは同じ属性で、JSXやSvelteのHTML要素でも同じ属性ですが、JSXが設定する `<svg>` 要素では同じ綴りだけが同じ属性です

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
