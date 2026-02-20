# `@markuplint/rule-textlint` 廃止: v4 から v5 への移行ガイド

## 対象読者

- `@markuplint/rule-textlint` をインストールし、markuplint の設定で `textlint` ルールを使用していた**ユーザー**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `@markuplint/rule-textlint` パッケージの廃止 | markuplint 内で `textlint` ルールを使用してテキスト検査を行っていたユーザー |

## パッケージの廃止

`@markuplint/rule-textlint` は完全に非推奨となり、markuplint エコシステムから削除されました。

### 理由

- **`@markuplint/markdown-parser`** が作成され、markuplint で Markdown ファイルを直接 lint できるようになりました。
- **textlint** には HTML 内のテキストを検査するための [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) が既に提供されています。
- 両ツール間の密な連携は不要となりました。それぞれのツールが独立して対応可能です。

### 移行手順

1. 依存関係から `@markuplint/rule-textlint` を**削除**してください。
2. markuplint の設定から `textlint` ルールを**削除**してください。
3. HTML ファイル内のテキスト検査には、**textlint を単体で** `textlint-plugin-html` と共に使用してください。
4. markuplint での Markdown lint には `@markuplint/markdown-parser` が利用可能です。
