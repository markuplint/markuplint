---
sidebar_position: 0
title: '改名と分割'
---

# ルールの改名と分割

**安定版 v4**（`v4.18.3`）由来のルール名変更のマスターです。改名・分割を超えるオプション形式は `rules/` 配下。[ARIA バージョンと `wai-aria` の対応](/docs/migration/v4-to-v5/aria) も参照してください。

v5 は動詞 prefix、独立した検査ごとに 1 ルール、仕様準拠メタデータです。**v4 の組み込み 38 ルールは v5 で 106 になります。** うち 12 がリネーム、10 が分割、`wai-aria` が 21 ルール、残りは v4 に前身のない新検査です。

**改名・分割された**旧名は非推奨警告付きで展開されます（v6 で削除）。**名前が変わっていない**ルールにはエイリアスがありません。[既知の移行ギャップ](#既知の移行ギャップ) を参照してください。

## カテゴリ

v4 は 5 分類（`validation`、`a11y`、`naming-convention`、`maintainability`、`style`）。v5 は各 `meta.ts` の `category` による 9 分類です。設定ファイルには出ません。

| カテゴリ          | 内容                                            |
| ----------------- | ----------------------------------------------- |
| `syntax`          | パースレベルの適合                              |
| `structure`       | コンテンツモデル、祖先、doctype、テーブルモデル |
| `attributes`      | 属性名・値                                      |
| `references`      | ID・フラグメント参照                            |
| `forms`           | フォーム                                        |
| `a11y`            | ARIA とアクセシビリティ                         |
| `style`           | 書式・命名の選好                                |
| `maintainability` | プロジェクト衛生                                |
| `compat`          | browserslist × BCD、実験的・非標準              |

`naming-convention`（`class-naming` のみ）は `style` に入ります。

## 1:1 リネーム

安定版 v4 に存在した 12 件です。

| 旧名 (v4)                   | 新名                       |
| --------------------------- | -------------------------- |
| `attr-duplication`          | `no-duplicate-attr`        |
| `id-duplication`            | `no-duplicate-id`          |
| `required-attr`             | `require-attr`             |
| `required-element`          | `require-element`          |
| `ineffective-attr`          | `no-ineffective-attr`      |
| `end-tag`                   | `require-end-tag`          |
| `disallowed-element`        | `no-restricted-element`    |
| `heading-levels`            | `no-skipped-heading-level` |
| `neighbor-popovers`         | `require-adjacent-popover` |
| `no-hard-code-id`           | `no-hardcoded-id`          |
| `no-use-event-handler-attr` | `no-event-handler-attr`    |
| `use-list`                  | `no-pseudo-list`           |

`required-attr` → `require-attr` は `{ name, value }` 照合を維持します。[スコープ変更](#スコープ変更) を参照。

## 分割

安定版 v4 に存在した 10 名です。分割先は独立して設定できます。

| 旧名 (v4)                     | 分割先                             | 検査内容                                                             |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `invalid-attr`                | `no-unknown-attr`                  | 仕様にない名前                                                       |
|                               | `no-disallowed-attr`               | 定義はあるがここでは不許可                                           |
|                               | `no-invalid-attr-value`            | 値の型・文法                                                         |
|                               | `no-restricted-attr`               | ユーザーの `disallowAttrs` のみ。未設定ならエイリアスに含めない      |
| `doctype`                     | `require-doctype`                  | DOCTYPE 欠如                                                         |
|                               | `no-obsolete-doctype`              | 旧 public/system 識別子。`denyObsoleteType: false` なら省略          |
| `character-reference`         | `no-malformed-character-reference` | 不正な文字参照                                                       |
|                               | `no-unescaped-char`                | エスケープされていない `<` / 曖昧な `&`                              |
| `deprecated-attr`             | `no-obsolete-attr`                 | 仕様から削除された属性（`error`）                                    |
|                               | `no-deprecated-attr`               | MDN/BCD の非推奨（`warning`）                                        |
| `deprecated-element`          | `no-obsolete-element`              | 廃止要素（`error`）                                                  |
|                               | `no-deprecated-element`            | 非推奨要素（`warning`）                                              |
| `landmark-roles`              | `no-nested-top-level-landmark`     | 入れ子の `banner` / `main` / `contentinfo`                           |
|                               | `require-landmark-label`           | 重複ランドマークの名前。`labelEachArea: false` なら省略              |
| `no-refer-to-non-existent-id` | `no-refer-to-non-existent-id`      | `DOMID` / ARIA ID 参照（名前維持 — [ギャップ](#既知の移行ギャップ)） |
|                               | `no-broken-fragment-link`          | `a[href]` / `area[href]` フラグメント                                |
| `permitted-contents`          | `permitted-contents`               | 子のコンテンツモデル（名前維持 — [ギャップ](#既知の移行ギャップ)）   |
|                               | `no-disallowed-ancestor`           | `forbiddenAncestors`                                                 |
|                               | `require-ancestor`                 | `descendantOf`                                                       |
|                               | `no-duplicate-sibling-attr`        | 兄弟間で一意な属性                                                   |
| `required-h1`                 | `require-h1`                       | `<h1>` 欠如                                                          |
|                               | `no-duplicate-h1`                  | 重複 `<h1>`。`expected-once: false` なら省略                         |
| `table-row-column-alignment`  | `no-table-cell-overlap`            | セル重なり（`error`）                                                |
|                               | `no-table-span-overflow`           | 行グループを越える span（`error`）                                   |
|                               | `no-empty-table-track`             | アンカーのない行・列（`error`）                                      |
|                               | `consistent-table-row-length`      | 列数の不揃い（`warning`）                                            |

`aria-*` と `role` は `invalid-attr` 系の仕様検査 3 ルールでは対象外です。ARIA ルールが担当します。

### オプション連動の分割

- `doctype`: `denyObsoleteType` が `false` なら `no-obsolete-doctype` を付けない。
- `landmark-roles`: `labelEachArea` が `false` なら `require-landmark-label` を付けない。
- `required-h1`: `expected-once` が `false` なら `no-duplicate-h1` を付けない。
- `invalid-attr`: `disallowAttrs` があるときだけ `no-restricted-attr`。振り分けは [`invalid-attr`](/docs/migration/v4-to-v5/rules/invalid-attr)。

エイリアスが自動で行います。手書きするなら同じ振り分けにしてください。

## v5 での新規（v4 に相当なし）

移行元のない検査です。プリセットが有効化するものは [プリセット](#プリセットの変更) を参照。

`attr-order`、`form-attr-references-form`、`head-element-order`、`input-list-references-datalist`、`itemprop-requires-itemscope`、`label-for-references-labelable`、`label-no-multiple-controls`、`link-types`、`map-id-name-match`、`meta-charset-position`、`meter-value-bounds`、`no-always-matching-source`、`no-content-after-body`、`no-duplicate-autofocus`、`no-duplicate-visible-main`、`no-experimental-features`、`no-extra-selected-options`、`no-input-file-value`、`no-mismatched-aspect-ratio`、`no-mixed-srcset-descriptors`、`no-nonstandard-features`、`no-redundant-accessible-name`、`no-stray-head-or-body-tag`、`no-unclosed-element-at-eof`、`no-unpaired-srcset-sizes`、`no-unsupported-browser-features`、`progress-value-bounds`、`require-dialog-autofocus`、`sizes-auto-requires-lazy-loading`、`usemap-references-map`、`valid-importmap`、`valid-speculation-rules`。

`label-no-multiple-controls` はルール名としては新規ですが、検査自体は v4 の `label-has-control` 内にありました。[既知の移行ギャップ](#既知の移行ギャップ)。

`require-parent-role` と `tab-requires-tabpanel` は v4 の `wai-aria` 実装には無く、エイリアスと `a11y` プリセットでは有効になります。[ARIA](/docs/migration/v4-to-v5/aria)。

## 削除

ルール名として消える v4 組み込みは `wai-aria` だけです。v6 までエイリアスで 21 ルールに展開されます。

## スコープ変更

- **`require-attr`**: v4 `required-attr` と同じ範囲（`{ name, value }` 含む）。
- **`label-has-control`**: 関連コントロールが無い `<label>` のみ。2 つ目のコントロールは `label-no-multiple-controls`。

## 既知の移行ギャップ {#既知の移行ギャップ}

:::danger
旧名がそのまま残るため **非推奨警告はありません。** 生設定で旧名だけ有効だと、分割先の検査が静かに落ちます。
:::

| 使い続ける v4 名              | 自分で足す分割先                                                          |
| ----------------------------- | ------------------------------------------------------------------------- |
| `permitted-contents`          | `no-disallowed-ancestor`、`require-ancestor`、`no-duplicate-sibling-attr` |
| `no-refer-to-non-existent-id` | `no-broken-fragment-link`                                                 |
| `label-has-control`           | `label-no-multiple-controls`                                              |

`markuplint:html-standard` は `permitted-contents` の兄弟と `label-no-multiple-controls` を既に入れています。`markuplint:a11y` は `no-broken-fragment-link` と `label-has-control` です。`markuplint:recommended` は両方を extends します。

プリセットでも残る穴:

- **`markuplint:html-standard` だけ** では `no-broken-fragment-link` は入りません（`a11y` のみ）。`no-refer-to-non-existent-id` は入ります。
- **`markuplint:a11y` だけ** では `label-no-multiple-controls` は入りません（`html-standard` のみ）。v4 の `a11y` では `label-has-control` がこの検査もしていました。

## severity の変更

v4 の既定は `createRule` が指定しなければ `error` です。

| ルール                                                                      | v4                                              | v5        |
| --------------------------------------------------------------------------- | ----------------------------------------------- | --------- |
| `no-table-cell-overlap` / `no-table-span-overflow` / `no-empty-table-track` | `warning`（`table-row-column-alignment`）       | `error`   |
| `consistent-table-row-length`                                               | `warning`（同じ複合ルール）                     | `warning` |
| `no-duplicate-dt`                                                           | `error`                                         | `warning` |
| `no-obsolete-attr` / `no-obsolete-element`                                  | `error`（`deprecated-*`）                       | `error`   |
| `no-deprecated-attr` / `no-deprecated-element`                              | `error`（同じ複合）                             | `warning` |
| `no-broken-fragment-link`                                                   | `error`（`no-refer-to-non-existent-id` の一部） | `warning` |
| `require-h1` / `no-duplicate-h1`                                            | `error`（`required-h1`）                        | `warning` |
| `require-adjacent-popover`                                                  | `error`（`neighbor-popovers`）                  | `warning` |

`no-consecutive-br` は `warning` のままです。

:::caution
テーブルモデル 3 件の `error` は、v4 では警告だったマークアップで CI を落とすことがあります。
:::

## プリセットの変更

`v4.18.3` の JSON と現行 `preset.*.jsonc` で確認しています。

- **`markuplint:code-styles`**: v4 は `{}`。いまは `case-sensitive-attr-name` と `case-sensitive-tag-name`。
- **`markuplint:security`**: v4 は `{}`。いまは `no-event-handler-attr`。
- **`markuplint:compat`**: v4 には無い。v5 の `recommended` が extends し、`no-unsupported-browser-features` と `no-nonstandard-features` を有効化（`no-experimental-features` はオプトインのまま）。
- **`markuplint:performance`**: `head-element-order` と `no-mismatched-aspect-ratio` を追加。既存 `nodeRules` の趣旨は同じ。
- **`markuplint:html-standard`**: v4 にあった `no-duplicate-dt` と `no-ineffective-attr` を外す。**新たに** `no-unknown-attr` / `no-disallowed-attr` / `no-invalid-attr-value`（v4 の `html-standard` に `invalid-attr` は無かった）。パース構造・srcset・フォーム・`itemprop-requires-itemscope`・`permitted-contents` の兄弟なども追加。
- **`markuplint:a11y`**: `wai-aria` 相当を名前付きグループに。v4 傘の既定オフ／未実装の検査も有効。[ARIA](/docs/migration/v4-to-v5/aria)。
- **`no-refer-to-non-existent-id`** と **`no-duplicate-id`** は `a11y` と `html-standard` の両方に残る。
- **`markuplint:recommended`**: 従来の extends に加え **compat**。

どのプリセットにも入らない: `attr-order`、`attr-value-quotes`、`class-naming`、`no-boolean-attr-value`、`no-default-value`、`no-empty-palpable-content`、`no-duplicate-dt`、`no-ineffective-attr`、`no-experimental-features`。
