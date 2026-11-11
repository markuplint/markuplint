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

## React が `<head>` へ移す要素

React は [`<title>`](https://react.dev/reference/react-dom/components/title)、[`<meta>`](https://react.dev/reference/react-dom/components/meta)、[`<link>`](https://react.dev/reference/react-dom/components/link)、[`<style>`](https://react.dev/reference/react-dom/components/style)（それぞれのリファレンスが挙げる条件を満たすもの。`<style>` なら `precedence` と `href`）を、書かれた位置に関係なくドキュメントの `<head>` へ移します。そのため React スペックは、これらを含む要素のコンテンツモデルでは検査せず、移動を求める属性を定義しています。

使っている React が各要素を書かれた位置にそのまま出力する場合（使っている React が移すかどうかは、上の各要素のリファレンスに書かれています）は、そのためのスペックを指定します。移動の扱いも属性の定義もありません。名前は、これらを移さない最後のメジャーバージョンの React に由来します:

```json class=config title=".markuplintrc"
{
  "specs": {
    "\\.[jt]sx$": "@markuplint/react-spec/react-18"
  }
}
```

## プリテンダーと併用

スキャンには`@markuplint/pretenders`が必要です。`markuplint`はこれをインストールしません:

```shell npm2yarn
npm install -D @markuplint/pretenders
```

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
