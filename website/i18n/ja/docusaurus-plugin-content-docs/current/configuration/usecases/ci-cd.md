# CI/CD連携

CIパイプラインでMarkuplintを実行する方法。

## GitHub Actions

```yaml title=".github/workflows/lint.yml"
name: Lint HTML
on: [push, pull_request]

jobs:
  markuplint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx markuplint "src/**/*.html"
```

## 出力フォーマット

`--format` フラグで異なるCIシステムに対応できます:

```shell
# デフォルトの人間向け出力
markuplint "src/**/*.html"

# GitHub Actionsアノテーション（PRのdiffにインライン表示）
markuplint "src/**/*.html" --format GitHub

# カスタム処理用のJSON
markuplint "src/**/*.html" --format JSON
```

## 段階的な導入

既存プロジェクトに多数の違反がある場合は、以下の戦略を使います:

### 報告する違反数を制限

```shell
# 最初の50件の違反のみ表示
markuplint "src/**/*.html" --max-count=50
```

### 警告のしきい値を設定

```shell
# 警告は30件まで許可、エラーは即失敗
markuplint "src/**/*.html" --max-warnings=30
```

### 一括抑制

現在の違反をすべて抑制し、新しいコードのみにルールを適用:

```shell
# 現在の違反を記録
markuplint "src/**/*.html" --suppress

# suppressionsファイルをコミット
git add markuplint-suppressions.json

# 以降、新しい違反のみ報告される
markuplint "src/**/*.html"
```

詳しくは[一括抑制](/docs/guides/ignoring-code#bulk-suppressions)を参照してください。
