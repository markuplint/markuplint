# ガイド

## はじめる

### もっとも簡単な方法: VS Code 拡張 {#the-quickest-way-vs-code-extension}

[Markuplint拡張](https://marketplace.visualstudio.com/items?itemName=markuplint.vscode-markuplint)をVisual Studio Marketplaceからインストールするか、VS Codeの拡張機能パネルで「markuplint」と検索してください。

![VS Codeの拡張機能パネル: 「markuplint」で検索するとYusuke Hirao作のMarkuplint拡張が表示される](/img/guides/vscode-search.png)

**これだけです。** HTMLファイルを開けば、Markuplintがリアルタイムでチェックを始めます。インストールも設定ファイルも不要です。デフォルトで[推奨プリセット](/docs/guides/presets)が適用されます。

![VS CodeエディタでHTMLファイルを開いた画面。11行目のalt属性の重複箇所に黄色い波線が表示されている。下部のProblemsパネルには「The attribute name is duplicated Markuplint(attr-duplication) Ln 11, Col 45」と表示](/img/guides/vscode-problems.png)

警告にホバーすると、ルール名と詳細が表示されます。ルール名をクリックするとドキュメントに飛べます。

![重複属性のホバーポップアップ。「The attribute name is duplicated Markuplint(attr-duplication)」というメッセージと、計算済みアクセシビリティプロパティ（role: img、name: "alternative text"、focusable: false）が表示されている](/img/guides/vscode-hover.png)

:::tip
VS Codeベースのエディタにも対応しています: [Cursor](https://www.cursor.com/)、[Windsurf](https://codeium.com/windsurf)、[VSCodium](https://vscodium.com/)など、VS Code拡張をサポートするエディタで利用できます。
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

- **Node.js** v24.0.0以上

## 次のステップ

- **[プリセットを使う](/docs/guides/presets)** — プロジェクトに合ったプリセットを選び、有効にするルールをカスタマイズする
- **[ルールを設定する](/docs/guides/applying-rules)** — 個別のルールを調整し、特定の要素に異なる設定を適用する
- **[HTML以外の構文で使う](/docs/guides/beyond-html)** — JSX、Vue、Svelte、Pug、PHPなどのパーサーを設定する
- **[設定](/docs/configuration)** — 設定ファイルの形式と利用可能なすべてのプロパティについて
