---
sidebar_position: 2
title: CLI
---

# CLI

v5 における CLI フラグと動作の変更です。

## 新機能: `--fix-dry-run`

ファイルを変更せずに `--fix` の変更内容をプレビューできます。unified diff 形式で出力されます:

```bash
markuplint --fix-dry-run index.html
```

```diff
--- a/index.html
+++ b/index.html
@@ -1,1 +1,1 @@
-<input required="required" />
+<input required />
```

:::tip
`--fix` と `--fix-dry-run` の両方を指定した場合、`--fix-dry-run` が優先されます。ファイルは変更されません。
:::

## `--allow-warnings` のデフォルト変更

v4 では、警告があるとデフォルトで非ゼロの終了コードが返されていました。v5 では、警告はデフォルトで**許可**されます。

### 変更前（v4）

```bash
# 警告があると終了コード 1
markuplint index.html
echo $?  # 1（警告がある場合）
```

### 変更後（v5）

```bash
# 警告はデフォルトで許可（終了コード 0）
markuplint index.html
echo $?  # 0（警告があっても）
```

### 対応方法

:::caution 警告を検出する CI パイプラインの場合
以前の動作を維持するには `--no-allow-warnings` を追加してください:

```bash
# v4
markuplint index.html

# v5 -- 同じ動作
markuplint --no-allow-warnings index.html
```

:::

`--allow-warnings` を既に使用していた場合は、削除してください。デフォルトの動作になりました:

```bash
# v4
markuplint --allow-warnings index.html

# v5 -- 不要になりました
markuplint index.html
```

:::tip
警告のしきい値をより細かく制御するには `--max-warnings=N` を使用してください。
:::

## `--config` がデフォルト設定とマージしなくなった

v4 では、`--config` で指定したファイルとデフォルト設定ファイル（`.markuplintrc`）の両方が読み込まれ、マージされていました。v5 では、`--config` は指定したファイル**のみ**を使用します。

### 変更前（v4）

```bash
# custom.json と .markuplintrc の両方が読み込まれてマージされる
markuplint --config custom.json index.html
```

### 変更後（v5）

```bash
# custom.json のみ読み込まれ、.markuplintrc は無視される
markuplint --config custom.json index.html
```

### 対応方法

マージに依存していた場合は、設定ファイルの `extends` を使用してください:

```json
{
  "extends": ["./.markuplintrc"],
  "rules": {
    "your-custom-rule": true
  }
}
```
