# @markuplint/markdown-parser

[![npm version](https://badge.fury.io/js/%40markuplint%2Fmarkdown-parser.svg)](https://www.npmjs.com/package/@markuplint/markdown-parser)

**Markdown** ファイルで **markuplint** を使用するためのパーサーです。

Markdown 構文（見出し、リンク、画像、リスト、テーブルなど）を対応する HTML 要素に変換し、markuplint のルールで解析できるようにします。[GFM](https://github.github.com/gfm/)（テーブル、取り消し線、オートリンク）および YAML フロントマターをサポートしています。

## インストール

```shell
$ npm install -D @markuplint/markdown-parser

$ yarn add -D @markuplint/markdown-parser
```

## 使い方

[設定ファイル](https://markuplint.dev/configuration/#properties/parser)に `parser` オプションを追加してください。

```json
{
  "parser": {
    ".md$": "@markuplint/markdown-parser"
  }
}
```

## 対応構文

| Markdown                              | HTML                         |
| ------------------------------------- | ---------------------------- |
| `# 見出し`                            | `<h1>` – `<h6>`              |
| `[テキスト](url)` / `[テキスト][ref]` | `<a href="...">`             |
| `![alt](url)` / `![alt][ref]`         | `<img src="..." alt="...">`  |
| `- アイテム` / `1. アイテム`          | `<ul>` / `<ol>` と `<li>`    |
| `` `コード` ``                        | `<code>`                     |
| フェンスコードブロック                | `<pre><code>`                |
| `> 引用`                              | `<blockquote>`               |
| GFM テーブル                          | `<table>` と `<th>` / `<td>` |
| `~~テキスト~~`                        | `<del>`                      |
| `---`                                 | `<hr>`                       |
| 生 HTML                               | HTML としてパース            |

## 既知の制限事項

- **合成された属性位置**: Markdown 構文から導出された属性（例: `[テキスト](url)` の `href`）は、属性値の正確な文字位置ではなく、Markdown 構文全体のソース位置を共有します。
