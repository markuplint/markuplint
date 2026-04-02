# Vueプロジェクト

VueプロジェクトでのMarkuplintのセットアップ。

## 必要なもの

MarkuplintとVueパーサー、Vueスペックをインストールします:

```shell npm2yarn
npm install -D markuplint @markuplint/vue-parser @markuplint/vue-spec
```

## 設定

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-vue"],
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  }
}
```

この設定で:

- **recommended-vue** プリセットを適用（すべての基本プリセット + `no-hard-code-id` などのVue固有ルールを含む）
- `.vue` ファイルをVueパーサーで解析
- Vueスペックで Vue 固有の属性やディレクティブ（`v-if`、`v-for`、`:key`、`@click`など）を認識

## プリテンダーと併用

カスタムコンポーネントをネイティブのHTML要素として検証したい場合は、[プリテンダー](/docs/guides/beyond-html#pretenders)を追加します。**自動スキャン**の利用を推奨します — ソースファイルからコンポーネントと要素の対応を自動で検出するため、手動で管理する必要がありません:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-vue"],
  "parser": {
    "\\.vue$": "@markuplint/vue-parser"
  },
  "specs": {
    "\\.vue$": "@markuplint/vue-spec"
  },
  "pretenders": {
    "scan": [
      {
        "files": "./src/components/**/*.vue"
      }
    ]
  }
}
```

:::tip
`scan` 機能は v5 で導入されました。コンポーネントのマッピングを手動でリスト化する必要がなくなります — コンポーネントのディレクトリを指定するだけで、Markuplintが自動的に処理します。
:::
