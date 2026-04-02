# ルールを適用する

Markuplintは[設定ファイル](/docs/configuration)が見つからない場合、デフォルトで[推奨プリセット](/docs/guides/presets)を適用します。設定ファイルを用意すれば、どのルールを有効にするか、どのように動作させるかをカスタマイズできます。

## プリセットルールのカスタマイズ {#customizing-preset-rules}

[プリセット](/docs/guides/presets)を使っている場合、プリセットから離れることなく個別のルールをオーバーライドできます。プリセットは `namespace/rule-name` 形式の**名前付きルール**（例: `a11y/html-lang`）を定義しており、無効化、深刻度の変更、名前空間ワイルドカードによる一括制御が可能です:

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // 特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前付きルールの深刻度を変更
    "a11y/no-autofocus-outside-dialog": "warning",

    // 名前空間内のすべての名前付きルールを無効化
    "a11y/*": false,

    // ベースルール名で無効化（それを含むすべてのプリセットに影響）
    "id-duplication": false
  }
}
```

複数のプリセットが同じベースルールをラップしている場合（例: `a11y/id-duplication` と `html-standard/id-duplication`）、それぞれ独立して実行されます。ベースルール名を `false` に設定すると、すべての名前付きルールグループ内で該当ルールが無効化されます — 詳細は[ベースルール名による無効化](/docs/configuration/properties#disable-by-base-rule-name)を参照してください。

独自の[名前付きルールグループ](/docs/configuration/properties#named-rule-groups)を定義することもできます。名前付きルールの一覧は[プリセット内の名前付きルール](/docs/guides/presets#named-rules)を参照してください。

## 個別のルールを有効にする

設定ファイルの `rules` プロパティにルールを追加します。`false` 以外の値を指定するとルールが有効になります:

```json class=config
{
  "rules": {
    "attr-duplication": true,
    "class-naming": "/[a-z]+/",
    "required-attr": {
      "value": "true"
    }
  }
}
```

`false` を設定するとルールが無効化されます。値の形式の詳細は [`rules` プロパティリファレンス](/docs/configuration/properties#rules)を参照してください。

利用可能なルールの一覧は[ルールページ](/docs/rules/)にあります。

## 特定の要素にルールを適用する {#applying-rules-to-specific-elements}

特定の要素にのみルールを適用するには、`nodeRules` または `childNodeRules` プロパティで[**セレクタ**](./selectors)を使います。

**`nodeRules`** はマッチした要素のみにルールを適用します:

```json class=config
{
  "nodeRules": [
    {
      "selector": "main",
      "rules": {
        "class-naming": "/[a-z]+(__[a-z]+)?/"
      }
    }
  ]
}
```

**`childNodeRules`** はマッチした要素の子要素にルールを適用します。`inheritance` を `true` にすると、すべての子孫要素に適用されます:

```json class=config
{
  "childNodeRules": [
    {
      "selector": ".legacy-section",
      "inheritance": true,
      "rules": {
        // a11y/wai-aria などの仮想ルールも無効化されます
        "wai-aria": false
      }
    }
  ]
}
```

`nodeRules` と `childNodeRules` ではベースルール名（例: `"wai-aria"`）や名前空間ワイルドカード（例: `"a11y/*": false`）も使用できます。これらはプリセットが作成した仮想ルールに自動的に適用されます — 詳細は [nodeRules リファレンス](/docs/configuration/properties#noderules) を参照してください。

## カスタムルールを使う {#using-custom-rules}

サードパーティ製のルールや、[自作のルール](./custom-rule)を使用できます。スラッシュ区切りでプラグイン名とルール名を指定します:

```json class=config
{
  "plugins": ["./my-plugin.js"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```

## 次のステップ

- **[セレクタ](/docs/guides/selectors)** — 特定の要素を対象にするセレクタの構文を学ぶ
- **[プリセットを使う](/docs/guides/presets)** — 各プリセットの内容と組み合わせ方
- **[設定プロパティ](/docs/configuration/properties)** — すべての設定オプションのリファレンス
