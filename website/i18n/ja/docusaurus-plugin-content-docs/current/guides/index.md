# ガイド

## はじめる

### 気軽につかう

```shell
npx markuplint target.html
```

:::info

[設定ファイル](/docs/configuration)がない場合は[推奨プリセット](/docs/guides/presets)が適用されます。

:::

### 必須スペック

- **Node.js** v18.18.0以上

### プロジェクトでつかう

[設定ファイル](/docs/configuration)をつくり、依存モジュールをインストールします。

```shell
npx markuplint --init
```

コマンド上で対話式の質問に答えます。
これにより`markuplint`を含む必要なモジュールがインストールされます。

`package.json`の`scripts`プロパティにコマンドを追記します。

```json title="package.json"
{
  "scripts": {
    "lint:html": "markuplint \"**/*.html\""
  }
}
```

ターゲットパスを変更したい場合は、定義プロジェクトに合わせて変更してください。

以下のようにスクリプトを実行します。

```shell npm2yarn
npm run lint:html
```

## Visual Studio Codeでつかう

[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=yusukehirao.vscode-markuplint)からインストール可能です。もしくは&ldquo;markuplint&rdquo;とVS Code拡張機能から検索してください。
