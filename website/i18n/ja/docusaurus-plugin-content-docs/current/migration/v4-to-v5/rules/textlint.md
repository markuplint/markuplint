---
sidebar_position: 4
title: textlint
---

# `@markuplint/rule-textlint` の廃止

`@markuplint/rule-textlint` パッケージは Markuplint エコシステムから完全に削除されました。

## 変更一覧

| 変更内容                                     | 影響範囲                                              |
| -------------------------------------------- | ----------------------------------------------------- |
| `@markuplint/rule-textlint` パッケージの削除 | Markuplint で `textlint` ルールを設定していたユーザー |

## 削除の理由

- **Markuplint が Markdown に対応** -- `@markuplint/markdown-parser` により、Markuplint で Markdown ファイルを直接 lint できるようになりました。
- **textlint が HTML に対応済み** -- textlint には HTML 内のテキストを検査するための [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) が提供されています。
- 両ツール間の密な連携は不要になりました。それぞれが独立して対応可能です。

## 移行手順

### ステップ1: パッケージをアンインストール

```bash
npm uninstall @markuplint/rule-textlint
```

### ステップ2: 設定からルールを削除

Markuplint の設定ファイルから `textlint` エントリを削除してください：

```json
{
  "rules": {
    // この行を削除：
    "textlint": { ... }
  }
}
```

### ステップ3: 代替手段を使用

:::tip 代替手段

- **HTML 内のテキスト検査**: [textlint](https://textlint.github.io/) と [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) を単体ツールとして使用してください。
- **Markuplint での Markdown lint**: `@markuplint/markdown-parser` を使用して Markdown ファイルを直接 lint できます。
  :::
