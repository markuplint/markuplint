---
sidebar_position: 1
title: 'v4 から v5'
---

# v4 から v5 へのマイグレーション

Markuplint v5 の破壊的変更をまとめたガイドです。該当する項目を確認してください。

:::caution はじめに
Node.js を **v24.0.0 以降**にアップデートしてください。Markuplint v5 の全パッケージで必須です。
:::

:::danger 警告が出ない変更が2件あります
v5 ではルールカタログの大半が改名・分割されましたが、ほぼすべては非推奨警告付きで旧名のまま動作します。次の2件だけは何も知らせてくれません。

- **`permitted-contents`** または **`no-refer-to-non-existent-id`** を生設定（プリセットを使わない設定）で直接有効化している場合、そこから分割されたチェックを静かに失います。どちらもルール名が変わっていないため、非推奨警告が出ません。
- **3つのルール（`no-table-cell-overlap`、`no-table-span-overflow`、`no-empty-table-track` — いずれも正真正銘の v4 由来の severity 変更で、v5 新設の検査ではありません）が `warning` から `error` に昇格**します。厳格な zero-warnings ゲートで通っていたビルドが、触っていないコードで失敗するようになります。

どちらも[改名と分割](/docs/migration/v4-to-v5/rules/rule-names)に詳細があります。
:::

:::tip 設定に何が必要かを最短で知る方法
アップグレードしてから Markuplint を一度実行してください。改名・分割されたルールを使っていれば、置き換え先がルール名で報告されます。

```
Rule "table-row-column-alignment" is deprecated and will be removed in v6.
Use no-table-cell-overlap, no-table-span-overflow, no-empty-table-track, consistent-table-row-length instead.
```

この出力をもとに設定を書き換えれば警告は消えます。ただし上記のサイレントな変更2件はどの警告でも知らせられないため、そこだけは手で確認してください。
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
| [Node.js](/docs/migration/v4-to-v5/nodejs)           | 最小バージョンを v24.0.0 に引き上げ（旧: v18.18.0）。ポリフィル削除。TypeScript ターゲットを ES2022 に変更。                                                                                                                              | 全ユーザー                                          |
| [CLI](/docs/migration/v4-to-v5/cli)                  | `--fix-dry-run` フラグ追加。`--allow-warnings` のデフォルトが `true` に変更。`--config` がデフォルト設定ファイルとマージしなくなった。                                                                                                    | CLI ユーザー、CI/CD パイプライン                    |
| [設定](/docs/migration/v4-to-v5/config)              | 共通 ARIA バージョン用の `ruleCommonSettings` 追加。Named nodeRules による個別設定可能なチェック。配列値が連結から上書きに変更。Options が shallow merge に変更。`:closest()` セレクタ非推奨。                                            | 設定ファイル作成者、プリセット作成者                |
| [ARIA](/docs/migration/v4-to-v5/aria)                | ARIA 1.3 がデフォルトに（旧: 1.2）。`generic` ロールが透過的に。`<aside>` の条件付きロールマッピング。`image`/`img` ロールが同義語に。`wai-aria` 傘ルールを削除し21個の後継ルールに置き換え。                                             | 全ユーザー                                          |
| [フレームワーク](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` 削除（`@markuplint/htmx-spec` に移行）。`@markuplint/alpine-parser/spec` 削除（`@markuplint/alpine-spec` に移行）。`directivePatterns` システム追加。`useIDLAttributeNames` を `acceptedAttrNames` にリネーム。 | htmx / Alpine.js ユーザー、スペックパッケージ作成者 |

### ルール

| ルール                                                                                  | 変更内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 影響範囲                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [改名と分割](/docs/migration/v4-to-v5/rules/rule-names)                                 | **まずここから。** 全てのルール名変更のマスター参照です: リネーム30件、分割25件、削除2件、新設1件、severity の変更、プリセットの再編成。旧名は非推奨警告付きで v6 まで動作しますが、例外が2件あります。                                                                                                                                                                                                                                                                                                                                                                                                                                     | 全ユーザー                                                       |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)                             | `no-unknown-attr` / `no-disallowed-attr` / `no-invalid-attr-value` / `no-restricted-attr` に4分割。属性値の `{ type: X }` ラッパー廃止。非推奨の `attrs` オプション削除。オブジェクト形式を非推奨化。                                                                                                                                                                                                                                                                                                                                                                                                                                       | `allowAttrs` / `disallowAttrs` を使用する設定作成者              |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)                     | `require-element` にリネーム。`ignoreOmittedElements` のデフォルトが `false` から `true` に変更。ゴースト要素が要件を満たさなくなった。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `required-element` を使用する設定作成者                          |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element)                 | `no-obsolete-element`（`error`）と `no-deprecated-element`（`warning`）に2分割。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `deprecated-element` を使用する設定作成者                        |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                                     | `@markuplint/rule-textlint` パッケージを削除。textlint 単体で `textlint-plugin-html` を使用。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `textlint` ルールのユーザー                                      |
| [parse-error](/docs/migration/v4-to-v5/rules/parse-error) (組み込み)                    | 組み込みチャネルが、致命的 `ParserError` に加えて HTML LS の非致命的なパースエラー (parse5 `onParseError` イベント) も surface できるように。**デフォルトはオフ** — `severity.parseError` で parse5 の code 単位にオプトイン。`severity.parseError` は `Partial<Record<MLASTParseErrorCode, …>>` 形式も受け付け、code ごとに severity を指定可能。新しい `parserOptions.documentMode` (`'auto' \| 'document' \| 'fragment'`) で document/fragment 自動判定をオーバーライドできるので、`<head>` 始まりの SSR partial で document レベルのエラーを無効化したり、doctype を省略した完全な page で `missing-doctype` を opt-in したりできます。 | 非致命的な HTML LS パースエラーも lint したいユーザー            |
| [table-row-column-alignment](/docs/migration/v4-to-v5/rules/table-row-column-alignment) | `no-table-cell-overlap` / `no-table-span-overflow` / `no-empty-table-track`（3件とも `error` に昇格）と `consistent-table-row-length`（`warning`）に4分割。テーブルを HTML LS の _forming a table_ アルゴリズムでモデル化。セルがひとつも開始しない列と行、行グループの末尾を越える `rowspan` を新たに報告。`rowspan` が下の行をちょうど埋めている場合に余分な列を報告しなくなった。                                                                                                                                                                                                                                                        | `colspan` / `rowspan` / `<col>` を使うテーブルを lint している人 |

## 開発者向け

カスタムルール作成者、パーサープラグイン開発者、Node.js API ユーザーに影響する変更です。

| 領域                                                         | 変更内容                                                                                                                       | 影響範囲                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| [ルール修正関数](/docs/migration/v4-to-v5/rule-fix-function) | カスタムルール向けの新しい自動修正 API。11個の組み込みルールが `--fix` に対応。                                                | カスタムルール作成者     |
| [API](/docs/migration/v4-to-v5/api)                          | レガシーの `exec()` 関数を削除。結果に `FixSummary` 追加。`computeCursorOffset()` をエクスポート。                             | Node.js API ユーザー     |
| [AST](/docs/migration/v4-to-v5/ast)                          | トークンプロパティのリネーム（`startOffset` から `offset` 等）。`selfClosingSolidus` 削除。`MLMarkupLanguageParser` 型の削除。 | パーサープラグイン開発者 |

:::tip
CLI や CI/CD でのみ Markuplint を使用している場合、「開発者向け」セクションはスキップできます。
:::
