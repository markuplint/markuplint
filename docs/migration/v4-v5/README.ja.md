# v4 から v5 への移行

最終安定版 v4（`v4.18.3`）から v5 へのアップグレード向けです。GitHub 上で読むためのコピーです。

v5 は **Node.js v24.0.0 以降** が必要です。[Node.js](./nodejs.ja.md) を参照してください。

> [!WARNING]
> 非推奨警告が出ない変更が二種類あります。
>
> - 生設定（プリセットなし）で **`permitted-contents`**、**`no-refer-to-non-existent-id`**、**`label-has-control`** だけを有効にしていると、名前が残ったまま分割された検査が静かに落ちます。詳細は [改名と分割](./rule-names.ja.md#既知の移行ギャップ) です。
> - テーブルモデルの 3 検査が `warning` から `error` に上がります（`no-table-cell-overlap`、`no-table-span-overflow`、`no-empty-table-track`）。警告ゼロのゲートだと、触っていないマークアップで落ちることがあります。

## 手順

1. Node.js v24 以降を入れ、CI も更新する。[Node.js](./nodejs.ja.md)。
2. 使う `markuplint` と `@markuplint/*` を同じ v5 に上げる。
3. htmx / Alpine を使っていたら [フレームワーク](./framework.ja.md) のパッケージ差し替えを行う。
4. 一度実行する。改名・分割された旧名は置換先を報告する。上の静かなギャップは [改名と分割](./rule-names.ja.md#既知の移行ギャップ) を別途確認する。
5. CI が警告を失敗にしていたら `--no-allow-warnings`。[CLI](./cli.ja.md)。
6. `--config` を使っていたら、`.markuplintrc` とマージされないことを確認する。
7. `extends` で配列ルール値やネストした `options` を使っていたら [設定](./config.ja.md)。

英語: [README.md](./README.md)。

## ユーザー向け

| 領域 | 概要 |
| --- | --- |
| [Node.js](./nodejs.ja.md) | 最小バージョンは v24.0.0（v4 の文書は v18.18.0）。TypeScript ターゲットは ES2022。 |
| [CLI](./cli.ja.md) | `--fix-dry-run` 追加。警告では既定で非ゼロ終了しなくなった（v4 相当は `--no-allow-warnings`）。`--config` は自動検出設定とマージしない。 |
| [設定](./config.ja.md) | `ruleCommonSettings`、名前付き nodeRules、配列の上書き、options の shallow merge、pretender 制限、`:closest()` 非推奨。 |
| [ARIA](./aria.ja.md) | 既定の ARIA は 1.3。`wai-aria` は 21 ルールに展開。v4 既定ではオフ／未実装だった検査も動く。 |
| [フレームワーク](./framework.ja.md) | `@markuplint/htmx-parser` 削除。Alpine の spec は `@markuplint/alpine-spec`。 |

### ルール

| ページ | 概要 |
| --- | --- |
| [改名と分割](./rule-names.ja.md) | リネーム 12、分割 10、`wai-aria` → 21、ギャップ、severity とプリセット。 |
| [`invalid-attr`](./rules/invalid-attr.ja.md) | 4 分割。`{ type: X }` ラッパー廃止。 |
| [`required-element`](./rules/required-element.ja.md) | `require-element` に改名。ゴースト要素は既定で要件を満たさない。 |
| [`deprecated-element`](./rules/deprecated-element.ja.md) | `no-obsolete-element`（`error`）と `no-deprecated-element`（`warning`）。 |
| [`table-row-column-alignment`](./rules/table-row-column-alignment.ja.md) | 4 分割。うち 3 つが `error`。 |
| [`parse-error`](./rules/parse-error.ja.md) | 非致命パースエラーを `severity.parseError` でオプトイン。既定オフ。 |
| [`textlint`](./rules/textlint.ja.md) | `@markuplint/rule-textlint` 削除。 |

## 開発者向け

| 領域 | 概要 |
| --- | --- |
| [ルール修正関数](./rule-fix-function.ja.md) | 違反ごとの `fix`。v4 の組み込みルールでは `--fix` は何もしなかった。 |
| [API](./api.ja.md) | レガシー `exec()` エクスポート削除。`FixSummary` 追加。 |
| [AST](./ast.ja.md) | トークン位置フィールド改名。パーサ型の削除。 |
