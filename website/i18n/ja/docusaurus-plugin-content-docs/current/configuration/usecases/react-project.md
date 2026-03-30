# Reactプロジェクト

React（JSX/TSX）プロジェクトでのMarkuplintのセットアップ。

## 必要なもの

MarkuplintとJSXパーサー、Reactスペックをインストールします:

```shell npm2yarn
npm install -D markuplint @markuplint/jsx-parser @markuplint/react-spec
```

## 設定

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  }
}
```

この設定で:

- **recommended-react** プリセットを適用（すべての基本プリセット + `no-hard-code-id` などのReact固有ルールを含む）
- `.jsx` と `.tsx` ファイルをJSXパーサーで解析
- Reactスペックで React 固有の属性（`key`、`className`、`htmlFor`など）を認識

## プリテンダーと併用

カスタムコンポーネントをネイティブのHTML要素として検証したい場合は、[プリテンダー](/docs/guides/beyond-html#pretenders)を追加します。**自動スキャン**の利用を推奨します — ソースファイルからコンポーネントと要素の対応を自動で検出するため、手動で管理する必要がありません:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.[jt]sx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec"
  },
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.tsx"
      }
    ]
  }
}
```

:::tip
`scan` 機能は v5 で導入されました。コンポーネントのマッピングを手動でリスト化する必要がなくなります — コンポーネントのディレクトリを指定するだけで、Markuplintが自動的に処理します。
:::
