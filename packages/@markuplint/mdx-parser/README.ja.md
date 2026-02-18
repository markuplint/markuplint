# @markuplint/mdx-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmdx-parser.svg)](https://www.npmjs.com/package/@markuplint/mdx-parser)

[**MDX**](https://mdxjs.com/) ファイルで **markuplint** を使用するためのパーサーです。

JSX 要素、式、import/export を標準的な Markdown コンテンツと併せてパースします。Markdown 構文は対応する HTML 要素に変換され、markuplint のルールで解析できるようになります。[GFM](https://github.github.com/gfm/)（テーブル、取り消し線、オートリンク）および YAML フロントマターをサポートしています。

## インストール

```shell
$ npm install -D @markuplint/mdx-parser

$ yarn add -D @markuplint/mdx-parser
```

## 使い方

[設定ファイル](https://markuplint.dev/configuration/#properties/parser)に `parser` と `specs` オプションを追加してください。

```json
{
  "parser": {
    ".mdx$": "@markuplint/mdx-parser"
  },
  "specs": {
    ".mdx$": "@markuplint/react-spec"
  }
}
```

## 機能

- **JSX 要素**: 自己閉じ（`<Badge />`）とコンテナ（`<Card>...</Card>`）の両方のコンポーネントに対応
- **IDL 属性変換**: React スタイルの属性（例: `className`、`htmlFor`）を対応する HTML 属性に変換
- **式**: `{variable}` や `{condition ? a : b}` を動的な値として扱う
- **ESM import/export**: `import` 文と `export` 文をブロックとして認識
- **JSX 内の Markdown**: JSX コンテナ内の Markdown コンテンツを再帰的にパース

## 既知の制限事項

- **MDX v2/v3 のみ**: MDX v1 構文はサポートされていません。
- **合成された属性位置**: Markdown 構文から導出された属性（例: `[テキスト](url)` の `href`）は、属性値の正確な文字位置ではなく、Markdown 構文全体のソース位置を共有します。
