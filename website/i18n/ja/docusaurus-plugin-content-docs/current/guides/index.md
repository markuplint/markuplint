# ガイド

## はじめる

### もっとも簡単な方法: VS Code 拡張

[Markuplint拡張](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint)をVisual Studio Marketplaceからインストールするか、VS Codeの拡張機能パネルで「markuplint」と検索してください。

**これだけです。** HTMLファイルを開けば、Markuplintがリアルタイムでチェックを始めます。インストールも設定ファイルも不要です。デフォルトで[推奨プリセット](/docs/guides/presets)が適用されます。

:::tip
[Cursor](https://www.cursor.com/)などのVS Codeベースのエディタにも対応しています。
:::

### フレームワーク（React、Vueなど）で使う

プロジェクトで**JSX、Vue、Svelte**などのテンプレート構文を使っている場合は、Markuplintとパーサープラグインをプロジェクトにインストールします:

```shell npm2yarn
npm install -D markuplint @markuplint/jsx-parser @markuplint/react-spec
```

プロジェクトルートに設定ファイル（`.markuplintrc`）を作成します:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended-react"],
  "parser": {
    "\\.jsx$": "@markuplint/jsx-parser"
  },
  "specs": {
    "\\.jsx$": "@markuplint/react-spec"
  }
}
```

:::info
`npx markuplint --init` を実行すると、対話形式でセットアップすることもできます。
:::

対応する構文の一覧と設定例は[HTML以外の構文で使う](/docs/guides/beyond-html)を参照してください。

### コマンドラインから使う

CIやnpmスクリプトでMarkuplintを実行したい場合は、プロジェクトにインストールします:

```shell npm2yarn
npm install -D markuplint
```

`package.json`にスクリプトを追加します:

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"**/*.html\""
  }
}
```

```shell npm2yarn
npm run lint:html
```

:::info
[設定ファイル](/docs/configuration)が見つからない場合は[推奨プリセット](/docs/guides/presets)が自動的に適用されます。
:::

#### 必須スペック

- **Node.js** v22.0.0以上

## 次のステップ

- **[プリセットを使う](/docs/guides/presets)** — プロジェクトに合ったプリセットを選び、有効にするルールをカスタマイズする
- **[ルールを設定する](/docs/guides/applying-rules)** — 個別のルールを調整し、特定の要素に異なる設定を適用する
- **[HTML以外の構文で使う](/docs/guides/beyond-html)** — JSX、Vue、Svelte、Pug、PHPなどのパーサーを設定する
- **[設定](/docs/configuration)** — 設定ファイルの形式と利用可能なすべてのプロパティについて
