# CLI 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- コマンドラインから `markuplint` を実行する **CLI ユーザー**
- パイプラインに `markuplint` を組み込んでいる **CI/CD メンテナー**

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| `--allow-warnings` のデフォルトが `true` に変更 | 終了コードの動作 |
| `--allow-warnings` が `--no-allow-warnings` にリネーム | CLI フラグ名 |

## `--allow-warnings` のデフォルト変更

v4 では、警告があるとデフォルトで非ゼロの終了コードが返されていました。v5 では、警告はデフォルトで許可されます（終了コード 0）。

### v4 の動作

```bash
# 警告があると終了コード 1
markuplint index.html
echo $?  # 1（警告がある場合）

# 明示的に警告を許可
markuplint --allow-warnings index.html
echo $?  # 0
```

### v5 の動作

```bash
# デフォルトで警告を許可（終了コード 0）
markuplint index.html
echo $?  # 0（警告があっても）

# 明示的に警告を禁止
markuplint --no-allow-warnings index.html
echo $?  # 1（警告がある場合）
```

### 移行方法

CI パイプラインが警告を検出するためにデフォルト動作に依存していた場合:

```bash
# v4
markuplint index.html

# v5 — 同じ動作を維持するには --no-allow-warnings を追加
markuplint --no-allow-warnings index.html
```

CI パイプラインで既に `--allow-warnings` を使用していた場合は、フラグを削除するだけです:

```bash
# v4
markuplint --allow-warnings index.html

# v5 — 不要になりました（デフォルト動作）
markuplint index.html
```

> **ヒント**: 許容する警告数をより細かく制御するには `--max-warnings=N` を使用してください。
