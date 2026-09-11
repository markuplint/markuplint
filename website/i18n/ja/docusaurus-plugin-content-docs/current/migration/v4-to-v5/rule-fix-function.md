---
sidebar_position: 6
title: 'ルール修正関数'
---

# ルール修正関数

v4 には `RuleSeed.fix()` と `--fix` がありましたが、**組み込みルールは未実装**で、`--fix` は何もしませんでした。v5 は `report()` の違反ごとの `fix` です。`fix` の無いルールはそのままです。

コールバックは検証に `fix=true`（CLI `--fix`）のときだけ走ります。

`IRuleFixer`: `replaceText`、`replaceRange`、`insertBefore`、`insertAfter`、`remove`、`removeRange`。トークンは `{ startOffset, raw }`。複数 `TextEdit` の配列は一括（重なりでグループごとスキップ）。

`@markuplint/rules` の `removeAttr` / `removeAttrValue`。重なりは再パースを最大 10 パス。

v5 で `fix` がある組み込み: `case-sensitive-tag-name`、`case-sensitive-attr-name`、`attr-value-quotes`、`no-boolean-attr-value`、`no-default-value`、`no-duplicate-attr`、`no-ineffective-attr`、`no-orphaned-end-tag`、`no-consecutive-br`、`attr-order`、`head-element-order`。

型は `@markuplint/ml-config` の `IRuleFixer`、`TextEdit`、`FixToken`。
