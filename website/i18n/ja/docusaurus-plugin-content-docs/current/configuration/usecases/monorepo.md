# モノレポ

モノレポ内の複数パッケージにまたがるMarkuplintのセットアップ。

## 戦略

リポジトリルートに**共通設定**を置き、必要に応じて**パッケージごとのオーバーライド**を使います。Markuplintは各ターゲットファイルから上方向に自動検索するため、ルートの `.markuplintrc` がすべてのパッケージに適用されます。

## 設定

### ルート設定（共通）

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  }
}
```

### パッケージごとのオーバーライド（任意）

異なるルールが必要なパッケージは、独自の `.markuplintrc` を持つことができます。Markuplintは**最も近い**設定ファイルを使うため、パッケージレベルの設定が完全に優先されます:

```json class=config title="packages/legacy-app/.markuplintrc"
{
  "extends": ["markuplint:recommended"],
  "rules": {
    "class-naming": false,
    "character-reference": false
  }
}
```

:::info
Markuplintは最も近い設定ファイルを見つけると**検索を中止**します。ESLintのカスケード動作とは異なります。パッケージレベルの設定がルートを継承する場合は `extends` で参照してください:

```json class=config title="packages/legacy-app/.markuplintrc"
{
  "extends": ["../../.markuplintrc"],
  "rules": {
    "class-naming": false
  }
}
```

:::

## CIでの実行

リポジトリルートに1つのリントスクリプトを追加します:

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"packages/*/src/**/*.{html,jsx,tsx,vue}\""
  }
}
```
