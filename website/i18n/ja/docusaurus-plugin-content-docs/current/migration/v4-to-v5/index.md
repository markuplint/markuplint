---
sidebar_position: 1
title: 'v4 から v5'
---

# v4 から v5 へのマイグレーション

このセクションでは、markuplint v5 で導入されたすべての破壊的変更と新機能について説明します。

## 概要

| 領域                                                         | 説明                                                      | 影響範囲                 |
| ------------------------------------------------------------ | --------------------------------------------------------- | ------------------------ |
| [Node.js](/docs/migration/v4-to-v5/nodejs)                   | 最小バージョンが v18.18.0+ に引き上げ                     | 全ユーザー               |
| [CLI](/docs/migration/v4-to-v5/cli)                          | `--fix` 削除、終了コードの変更                            | CLI ユーザー             |
| [設定](/docs/migration/v4-to-v5/config)                      | `ariaVersion` 削除、`overrides` → `overrideMode` リネーム | 設定ファイル作成者       |
| [ARIA](/docs/migration/v4-to-v5/aria)                        | ARIA 1.2 のみ対応、非推奨ロールの扱い変更                 | ルール利用者             |
| [フレームワーク](/docs/migration/v4-to-v5/framework)         | htmx/Alpine.js パーサー削除                               | htmx/Alpine.js ユーザー  |
| [ルール修正関数](/docs/migration/v4-to-v5/rule-fix-function) | カスタムルール向け新しい自動修正 API                      | カスタムルール作成者     |
| [API](/docs/migration/v4-to-v5/api)                          | `MLEngine` 削除、新しい `mlml()` API                      | API ユーザー             |
| [AST](/docs/migration/v4-to-v5/ast)                          | AST レベルのトークンプロパティ変更                        | パーサープラグイン開発者 |

### ルール

| ルール                                                                  | 説明                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)             | `allowAttrs` 削除、新しい `disallowAttrs` オプション |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)     | オプション形式が文字列からオブジェクトに変更         |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element) | 非推奨 HTML 要素を検出する新ルール                   |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                     | コアから削除                                         |
