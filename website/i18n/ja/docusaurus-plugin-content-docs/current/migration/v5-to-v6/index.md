---
sidebar_position: 1
title: 'v5 to v6'
---

# v5からv6への移行

このガイドは、v5からv6へアップグレードする方法を説明します。

:::danger 書かれた設定のままでは動かなくなる変更
プラグインの仕組みが削除されました。`plugins`や`extends`の`plugin:`が残っている設定は`config-error`の警告を出し、プラグイン由来のルールは実行されなくなります。[プラグインの仕組み](/docs/migration/v5-to-v6/plugins)を参照してください。

擬似クラス`:closest()`を削除しました。これを含む`nodeRules`や`childNodeRules`のセレクターは無効なセレクターで、ドキュメントにエラーが付き、そのドキュメントではルールが1つも実行されません。[`:closest()`セレクター](/docs/migration/v5-to-v6/closest)を参照してください。
:::

## ユーザー向け

| 項目                                                                      | 概要                                                                                                         | 影響を受ける人                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [プラグインの仕組み](/docs/migration/v5-to-v6/plugins)                    | `plugins`、`extends`の`plugin:`、カスタムルール、`--create-rule`、`@markuplint/create-rule`を削除。          | プラグイン・カスタムルールの利用者                 |
| [`pattern`属性](/docs/migration/v5-to-v6/pattern-attribute)               | `<input pattern>`の値を、HTML標準と同じく`v`フラグで、値そのものと包んだものの両方をコンパイルして検査する。 | `<input pattern>`・`no-invalid-attr-value`の利用者 |
| [`:closest()`セレクター](/docs/migration/v5-to-v6/closest)                | 擬似クラス`:closest()`を削除。`:is(X *)`を使う。                                                             | 設定の作者、`--search`の利用者                     |
| [ルールのARIAバージョン](/docs/migration/v5-to-v6/spec-data#aria-version) | WAI-ARIAを検査するルールが`options.version`を読まなくなった。`ruleCommonSettings.ariaVersion`を使う。        | `options.version`を設定していた設定の作者          |

## 開発者向け

| 項目                                                       | 概要                                                                                                                                                                                                                                                                           | 影響を受ける人                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [プラグインの仕組み](/docs/migration/v5-to-v6/plugins#api) | オプション`rules`・`importPresetRules`・`autoLoad`、`createPlugin()`、テスト用APIのシグネチャを変更・削除。                                                                                                                                                                    | Node.js API、カスタムルールの作者                                                                                                                     |
| [MLDOM](/docs/migration/v5-to-v6/mldom)                    | MLDOMがDOMインターフェースを実装しなくなった。メンバーの改名・削除、`@markuplint/ml-spec`の`SpecElement`、`UnexpectedCallError`の削除。                                                                                                                                        | `@markuplint/ml-core`・`@markuplint/ml-spec`・`@markuplint/selector`の利用者                                                                          |
| [スペックデータと型](/docs/migration/v5-to-v6/spec-data)   | 非推奨だったスペックのフィールド（`cites`・`categories`・`omission`・`description`・`valueDescriptions`）、ARIA 1.2のロールのフィールド名、`BrowsingContextName*`、カスタムCSS構文の`ebnf`と`properties`、`NodeRule`のフィールド、`@markuplint/file-resolver`のAPI 2つを削除。 | 拡張スペックの作者、`@markuplint/ml-spec`・`@markuplint/html-spec`・`@markuplint/types`・`@markuplint/ml-config`・`@markuplint/file-resolver`の利用者 |
