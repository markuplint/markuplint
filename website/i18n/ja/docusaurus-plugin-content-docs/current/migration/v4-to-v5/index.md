---
sidebar_position: 1
title: 'v4 から v5'
---

# v4 から v5 へのマイグレーション

最終安定版 v4（`v4.18.3`）から v5 へのガイドです。

:::caution はじめに
Node.js を **v24.0.0 以降**にしてください。v5 の全パッケージで必須です。[Node.js](/docs/migration/v4-to-v5/nodejs) を参照してください。
:::

:::danger 非推奨警告が出ない変更
改名・分割された旧名のほぼすべては v6 まで動きます。次は **動きません**。

- 生設定の **`permitted-contents`**、**`no-refer-to-non-existent-id`**、**`label-has-control`** — 名前が残るため分割先が警告なしで落ちます。`html-standard` だけだと `no-broken-fragment-link` が無く、`a11y` だけだと `label-no-multiple-controls` がありません。
- テーブルモデル 3 件が **`warning` → `error`**: `no-table-cell-overlap`、`no-table-span-overflow`、`no-empty-table-track`。

詳細は[改名と分割](/docs/migration/v4-to-v5/rules/rule-names#既知の移行ギャップ)です。
:::

:::info v5 で新設されたマークアップレベルのチェック（設定の対応不要、非推奨警告なし）
v5 では属性値以外の検証もいくつか厳格化されています（[`invalid-attr`](/docs/migration/v4-to-v5/rules/invalid-attr#上記に含まれていない追加パターン)側で個別に扱う項目とは別です）。いずれも発火に設定変更は不要で、v4 に対応する挙動が無いため非推奨警告も出ません。

- **`no-prohibited-naming`**: 明示的な `role` を持たない自律型カスタム要素（`<x-y>`、`is=` なし）は、`aria-label` / `aria-labelledby` / `aria-braillelabel` を持てなくなりました。ナーミングをサポートする role を付けるか、属性を外してください。
- **`element-supports-aria-prop`**: 3 つの文脈依存 ARIA 制約（[#3735](https://github.com/markuplint/markuplint/issues/3735)）— html-spec の定義で `properties: false` になっている要素（例: `<input type="hidden">`）はすべての `aria-*` 属性が禁止に、`button[popovertarget]`（状態は暗黙的に提供される）と `details` 内の `summary` では `aria-expanded` が禁止になりました。
- **`permitted-contents`**: MathML 要素は子要素数の厳密なチェックが入ります（例: `mfrac` はちょうど2個の子要素が必要）。SVG の `<a>` の自己ネストは禁止（SVG2 §17.6）。`<dl>` 内の `<div>` は `dt`+/`dd`+ のグループを1つだけ許容します — 複数グループにする場合は `<dl>` 直下に並べ、`<div>` はグループごとに1つにしてください。
  :::

## 手順

1. Node.js v24 以降。CI も更新。[Node.js](/docs/migration/v4-to-v5/nodejs)。
2. `markuplint` と `@markuplint/*` を同じ v5 に上げる。
3. htmx / Alpine なら[フレームワーク](/docs/migration/v4-to-v5/framework)。
4. 一度実行する。改名・分割の旧名は置換先を出す。静かなギャップは手で確認する。
5. CI が警告を失敗にしていたら `--no-allow-warnings`。[CLI](/docs/migration/v4-to-v5/cli)。
6. `--config` は `.markuplintrc` とマージしない。
7. `extends` の配列値・ネストした `options` は[設定](/docs/migration/v4-to-v5/config)。

:::tip AI によるマイグレーション支援
[Claude Code](https://claude.com/claude-code):

```bash
npx skills add markuplint/markuplint@migrations/v4-v5
```

:::

## ユーザー向け

| 領域                                                 | 概要                                                                                                                                                     | 影響                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| [Node.js](/docs/migration/v4-to-v5/nodejs)           | 最小 v24.0.0（v4 の文書は v18.18.0）。TypeScript は ES2022。                                                                                             | 全員                 |
| [CLI](/docs/migration/v4-to-v5/cli)                  | `--fix-dry-run`。警告は既定で許容（v4 相当は `--no-allow-warnings`）。`--config` はマージしない。                                                        | CLI、CI              |
| [設定](/docs/migration/v4-to-v5/config)              | `ruleCommonSettings`、名前付き nodeRules、配列上書き、shallow merge、pretender 制限、`:closest()` 非推奨。                                               | 設定作者             |
| [ARIA](/docs/migration/v4-to-v5/aria)                | 既定 ARIA 1.3。`wai-aria` は 21 ルール。v4 既定オフ／未実装の検査も動く。                                                                                | 全員                 |
| [フレームワーク](/docs/migration/v4-to-v5/framework) | `@markuplint/htmx-parser` 削除。Alpine spec は `@markuplint/alpine-spec`。                                                                               | htmx / Alpine.js     |
| [AST](/docs/migration/v4-to-v5/ast)                  | 同梱パーサー（html、vue、ejs、astro、mdx、jsx、svelte）は引用符なし属性値中の `/` で区切らず、値の一部として保持するようになりました。`pug` は影響なし。 | 該当パーサーの利用者 |

### ルール

| ページ                                                                                  | 概要                                                                                       | 影響                            |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------- |
| [改名と分割](/docs/migration/v4-to-v5/rules/rule-names)                                 | **まずここから。** リネーム 12、分割 10、`wai-aria` → 21、ギャップ、severity、プリセット。 | 全員                            |
| [invalid-attr](/docs/migration/v4-to-v5/rules/invalid-attr)                             | 4 分割。`{ type: X }` ラッパー廃止。                                                       | `allowAttrs` / `disallowAttrs`  |
| [required-element](/docs/migration/v4-to-v5/rules/required-element)                     | `require-element` に改名。ゴースト要素は既定で無視。                                       | `required-element`              |
| [deprecated-element](/docs/migration/v4-to-v5/rules/deprecated-element)                 | `no-obsolete-element`（`error`）と `no-deprecated-element`（`warning`）。                  | `deprecated-element`            |
| [table-row-column-alignment](/docs/migration/v4-to-v5/rules/table-row-column-alignment) | 4 分割。うち 3 つが `error`。                                                              | `colspan` / `rowspan` / `<col>` |
| [parse-error](/docs/migration/v4-to-v5/rules/parse-error)                               | 非致命パースエラーは `severity.parseError`。既定オフ。                                     | オプトイン                      |
| [textlint](/docs/migration/v4-to-v5/rules/textlint)                                     | `@markuplint/rule-textlint` 削除。                                                         | 旧 `textlint` ルール            |

## 開発者向け

| 領域                                                         | 概要                                                           | 影響             |
| ------------------------------------------------------------ | -------------------------------------------------------------- | ---------------- |
| [ルール修正関数](/docs/migration/v4-to-v5/rule-fix-function) | 違反ごとの `fix`。v4 の組み込みでは `--fix` は何もしなかった。 | カスタムルール   |
| [API](/docs/migration/v4-to-v5/api)                          | レガシー `exec()` 削除。`FixSummary` 追加。                    | Node.js API      |
| [AST](/docs/migration/v4-to-v5/ast)                          | トークンフィールド改名。パーサ型の削除。                       | パーサプラグイン |

:::tip
CLI や CI だけなら「開発者向け」はスキップできます。
:::
