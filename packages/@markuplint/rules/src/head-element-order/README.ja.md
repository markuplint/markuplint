---
description: '`<head>`内の要素が期待される順序でない場合に警告します。'
---

# `head-element-order`

`<head>`内の要素が期待される順序でない場合に警告します。

順序はCSSセレクタの配列で定義します。要素は最初にマッチしたセレクタの位置順にソートされます。どのセレクタにもマッチしない要素は末尾に配置され、元のソース順が保持されます。

オブジェクト形式のエントリで `"order": "alphabetical"` と `"attr"` キーを指定することで、グループ内のアルファベット順ソートも可能です。

<!-- textlint-disable ja-technical-writing/ja-no-mixed-period -->

❌ 間違ったコード例

<!-- prettier-ignore-start -->
```html
<head>
  <title>Title</title>
  <meta charset="UTF-8">
</head>
```
<!-- prettier-ignore-end -->

✅ 正しいコード例

<!-- prettier-ignore-start -->
```html
<head>
  <meta charset="UTF-8">
  <title>Title</title>
</head>
```
<!-- prettier-ignore-end -->

<!-- textlint-enable ja-technical-writing/ja-no-mixed-period -->

## 設定

### デフォルト値

```json
[
  "meta[charset]",
  "meta[http-equiv]",
  "meta[name=\"viewport\"]",
  "title",
  { "selector": "meta", "order": "alphabetical", "attr": "name" },
  "link",
  "style",
  "script"
]
```

#### この順序の根拠

- **`meta[charset]`** はHTML仕様でドキュメントの最初の1024バイト以内に配置する必要があります。先頭に置くことでこの制約を確実に満たせます。
- **`meta[http-equiv]`** はブラウザのドキュメント解釈に影響する可能性があるため（例: `X-UA-Compatible`）、早い位置に配置します。
- **`meta[name="viewport"]`** はモバイルデバイスでの初期ビューポートレイアウトを制御します。`<title>`より前に配置することで、ページ読み込み時のレイアウトシフトを回避できます。
- **`title`** はアクセシビリティとSEOに必要で、重要なメタ要素の後に配置するのが一般的です。
- **`meta`**（残り）は `description`、`author` など。`name` 属性でアルファベット順にソートすることで一貫性を保ちます。
- **`link`**、**`style`**、**`script`** はメタデータ要素の後に配置します。これはスタイルガイドやフレームワークで広く使われている慣習に沿っています。

### カスタム値

```json
{
  "head-element-order": [
    "meta[charset]",
    "meta[http-equiv]",
    "meta[name=\"viewport\"]",
    "title",
    { "selector": "meta", "order": "alphabetical", "attr": "name" },
    "link[rel=\"preconnect\"]",
    "link[rel=\"stylesheet\"]",
    "link",
    "style",
    "script[src][async]",
    "script[src][defer]",
    "script[src]",
    "script"
  ]
}
```

この高度な例では、[capo.js](https://github.com/rviscomi/capo.js/) のパフォーマンス推奨に従い、`link` と `script` 要素を読み込み挙動ごとに分離しています。`<link rel="preconnect">` はスタイルシートより前に配置し、非同期スクリプトは同期スクリプトと分離しています。

### 順序エントリ

各エントリは文字列（CSSセレクタ）またはオブジェクトです。オブジェクトは以下のプロパティを持ちます:

| プロパティ | 型                                   | デフォルト       | 説明                                       |
| ---------- | ------------------------------------ | ---------------- | ------------------------------------------ |
| `selector` | `string`                             | （必須）         | 要素にマッチするCSSセレクタ                |
| `order`    | `"source-order"` \| `"alphabetical"` | `"source-order"` | グループ内のソート順                       |
| `attr`     | `string`                             | -                | アルファベット順ソート時のソートキー属性名 |
