---
sidebar_position: 3
title: '設定'
---

# 設定

追加の多くはオプトインです。`extends` 下のマージは破壊的です。

| 変更                                                         | 影響                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| `ruleCommonSettings`                                         | 共有 ARIA バージョン                     |
| 名前付き nodeRules                                           | プリセット利用者・作者                   |
| `specConformance`                                            | プリセット作者、違反の表示               |
| 名前付き `nodeRules` / `childNodeRules` の `name` で重複排除 | `extends`                                |
| ルールの配列値は連結せず上書き                               | 配列値の `extends`                       |
| `options` は shallow merge                                   | ネストした options の `extends`          |
| pretender の `data` は追記                                   | pretender の `extends`                   |
| 標準 HTML/SVG タグへの pretender は無視                      | 組み込みタグを偽装していた設定           |
| `--config` は指定ファイルのみ                                | CLI。[CLI](/docs/migration/v4-to-v5/cli) |
| `:closest()` 非推奨                                          | nodeRules のセレクタ                     |

## `ruleCommonSettings` {#rulecommonsettings}

現状は `ariaVersion` のみです。優先順位（高い順）:

1. `require-accessible-name` / `no-refer-to-non-existent-id` の `options.ariaVersion`
2. `ruleCommonSettings.ariaVersion`
3. 組み込み推奨（v5 では `1.3`）

v4 の `wai-aria` `options.version` は 21 後継には渡りません。

カスタムルールは `document.ruleCommonSettings` を `verify()` で読めます。

## 名前付き nodeRules

例: `a11y/html-lang`。ベースルールを落とさずにその検査だけ `false` にできます。`a11y/*` で名前空間一括もできます。違反は `ruleId`（ベース）と `name`（グループ）。`specConformance` はメタデータのみで severity は変わりません。

## マージ

**名前付き nodeRules:** 同じ `name` は子が置き換え。名前なしは従来どおり連結。

**配列のルール値:** 子が **置き換え**（v4 は連結）。例: `no-restricted-element`（旧 `disallowed-element`）。

**options:** トップレベルだけマージ。ネストしたオブジェクトは丸ごと置き換え。

**pretender `data`:** 連結（v4 は置き換え）。`files` / `imports` は上書きのまま。

## 標準タグへの pretender

認識された HTML/SVG 要素への pretender は無視されます（[issue #3740](https://github.com/markuplint/markuplint/issues/3740)）。黙らせるならルールの disable / severity を使ってください。

## `:closest()` 非推奨

v6 で削除。`:is(… *)` に置き換えてください（例: `:closest(nav)` → `:is(nav *)`）。
