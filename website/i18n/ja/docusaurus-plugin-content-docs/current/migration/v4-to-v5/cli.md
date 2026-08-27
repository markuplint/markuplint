---
sidebar_position: 2
title: 'CLI'
---

# CLI

## `--fix-dry-run`

`--fix` が書く内容を unified diff で出します。ファイルは書き換えません。`--fix` と同時指定時は dry-run が優先されます。

## `--allow-warnings` の既定

v4: 警告があると非ゼロ終了（`--allow-warnings` で許容）。

v5: 警告は既定で許容。v4 相当は `--no-allow-warnings`。

`--max-warnings=N` はそのまま使えます。

## `--config` はマージしない

v4: `--config` は指定ファイル **と** 自動検出の `.markuplintrc` をマージ。

v5: 指定ファイル **だけ**。マージが必要なら、渡すファイルからプロジェクト設定を `extends` してください。
