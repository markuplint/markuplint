---
sidebar_position: 1
title: 'v4 から v5'
---

# v4 から v5 へのマイグレーション

Markuplint v5 の破壊的変更をまとめたガイドです。該当する項目を確認してください。

:::caution はじめに
Node.js を **v22.0.0 以降**にアップデートしてください。Markuplint v5 の全パッケージで必須です。
:::

:::tip AI によるマイグレーション支援
[Claude Code](https://claude.com/claude-code) を使用している場合、対話的にアップグレードを進めるマイグレーションスキルをインストールできます:

```bash
npx skills add markuplint/markuplint@migrate4-5
```

:::

## ユーザー向け

CLI ユーザー、設定ファイル作成者、CI/CD パイプラインに影響する変更です。

| 領域                                                 | 変更内容                                                                                                                                                                                                                                  | 影響範囲                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Node.js](/docs/migration/v4-to-v5/nodejs)           | 最小バージョンを v22.0.0 に引き上げ（旧: v18.18.0）。ポリフィル削除。TypeScript ターゲットを ES2022 に変更。                                                                                                                              | 全ユーザー                                          |
| [CLI](/docs/migration/v4-to-v5/cli)                  | `--fix-dry-run` フラグ追加。`--allow-warnings` のデフォルトが `true` に変更。`--config` がデフォルト設定ファイルとマージしなくなった。                                                                                                    | CLI ユーザー、CI/CD パイプライン                    |
| [設定](/docs/migration/v4-to-v5/config)              | 共通 ARIA バージョン用の `ruleCommonSettings` 追加。Named nodeRules による個別設定可能なチェック。配列値が連結から上書きに変更。Options が shallow merge に変更。`:closest()` セレクタ非推奨。                                            | 設定ファイル作成者、プリセット作成者                |
| [ARIA](/docs/migration/v4-to-v5/aria)                | ARIA 1.3 がデフォルトに（旧: 1.2）。`generic` ロールが透過的に。`<aside>` の条件付きロールマッピング。`image`/`img` ロールが同義語に。`wai-aria` オプションのリネーム。                                                                   | 全ユーザー                                          |
| [フレームワーク](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` 削除（`@markuplint/htmx-spec` に移行）。`@markuplint/alpine-parser/spec` 削除（`@markuplint/alpine-spec` に移行）。`directivePatterns` システム追加。`useIDLAttributeNames` を `acceptedAttrNames` にリネーム。 | htmx / Alpine.js ユーザー、スペックパッケージ作成者 |

### ルール

| ルール                                                                  | 変更内容                                                                                                  | 影響範囲                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)             | 属性値の `{ type: X }` ラッパー廃止。非推奨の `attrs` オプション削除。オブジェクト形式を非推奨化。        | `allowAttrs` / `disallowAttrs` を使用する設定作成者 |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)     | `ignoreOmittedElements` のデフォルトが `false` から `true` に変更。ゴースト要素が要件を満たさなくなった。 | `required-element` を使用する設定作成者             |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element) | 非標準要素の検出が `no-unsupported-features` に移管。                                                     | 非標準要素の検出に依存する設定作成者                |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                     | `@markuplint/rule-textlint` パッケージを削除。textlint 単体で `textlint-plugin-html` を使用。             | `textlint` ルールのユーザー                         |

## 開発者向け

カスタムルール作成者、パーサープラグイン開発者、Node.js API ユーザーに影響する変更です。

| 領域                                                         | 変更内容                                                                                                                       | 影響範囲                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| [ルール修正関数](/docs/migration/v4-to-v5/rule-fix-function) | カスタムルール向けの新しい自動修正 API。9つの組み込みルールが `--fix` に対応。                                                 | カスタムルール作成者     |
| [API](/docs/migration/v4-to-v5/api)                          | レガシーの `exec()` 関数を削除。結果に `FixSummary` 追加。`computeCursorOffset()` をエクスポート。                             | Node.js API ユーザー     |
| [AST](/docs/migration/v4-to-v5/ast)                          | トークンプロパティのリネーム（`startOffset` から `offset` 等）。`selfClosingSolidus` 削除。`MLMarkupLanguageParser` 型の削除。 | パーサープラグイン開発者 |

:::tip
CLI や CI/CD でのみ Markuplint を使用している場合、「開発者向け」セクションはスキップできます。
:::
