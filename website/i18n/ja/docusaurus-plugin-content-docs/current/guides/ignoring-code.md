# 除外設定

## ファイルの除外 {#ignoring-file}

設定の[`excludeFiles`](/docs/configuration/properties#excludefiles)プロパティを使用します。

## ルールの無効化

### セレクタによる無効化 {#disable-by-selector}

設定の[`nodeRules`](/docs/configuration/properties#noderules)もしくは[`childNodeRules`](/docs/configuration/properties#childnoderules)プロパティを使います。
[特定の要素にルールを適用する](./applying-rules/#applying-rules-to-specific-elements)を参考にしてください。

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "nodeRules": [
    {
      "selector": ".ignore",
      "rules": {
        "[[target-rule-id]]": false
      }
    }
  ]
}
```

`[[target-rule-id]]`の部分は無効化したい[ルールID](/docs/rules/)に適宜変えてください。

名前付きルールに対しても同じ方法が使えます — ベースルール名や名前空間ワイルドカードを使用できます:

```json class=config
{
  "extends": ["markuplint:recommended"],
  "nodeRules": [
    {
      "selector": ".legacy",
      "rules": {
        // ベースルール名で無効化 — a11y/wai-aria も無効化されます
        "wai-aria": false,

        // この要素のすべての a11y/* 名前付きルールを無効化
        "a11y/*": false
      }
    }
  ]
}
```

### 名前付きルールの無効化 {#disable-named-rules}

プリセットが定義する名前付きルールは、`rules` プロパティで `false` を指定して個別に無効化できます。名前空間ワイルドカードを使えば名前空間内のすべての名前付きルールを一括で無効化できます。また、ベースルール名を`false`に設定すると、そのベースルールを含むすべての名前付きルールグループ内で該当ルールが無効化されます — 詳細は[ベースルール名による無効化](/docs/configuration/properties#disable-by-base-rule-name)を参照してください。

```json class=config
{
  "extends": ["markuplint:recommended"],
  "rules": {
    // 特定の名前付きルールを無効化
    "a11y/html-lang": false,

    // 名前空間内のすべての名前付きルールを無効化
    "a11y/*": false,

    // ベースルール名で無効化（詳細はプロパティリファレンス参照）
    "id-duplication": false
  }
}
```

これらの機能は `nodeRules` と `childNodeRules` でも使えます — 詳細は [nodeRules リファレンス](/docs/configuration/properties#noderules) を参照してください。

利用可能な名前付きルールの一覧は[プリセット内の名前付きルール](/docs/guides/presets#named-rules)を参照してください。

### ルールを上書きして無効化 {#overriding-to-disable-rules}

設定の[`overrides`](/docs/configuration/properties#overrides)プロパティと[`overrideMode`](/docs/configuration/properties#overridemode)を使います。

```json class=config
{
  "rules": {
    "[[target-rule-id]]": true
  },
  "overrideMode": "merge",
  "overrides": {
    "./path/to/**/*": {
      "rules": {
        "any-rule": false
      }
    }
  }
}
```

`[[target-rule-id]]`の部分は無効化したい[ルールID](/docs/rules/)に適宜変えてください。

## 一括抑制（Bulk Suppressions） {#bulk-suppressions}

:::caution 実験的機能
この機能は実験的であり、今後のリリースで変更される可能性があります。
:::

既存プロジェクトに新しいルールを導入する際、現在の違反をすべて抑制し、新規コードに対してのみルールを適用できます。既存の違反を一度に修正するのが現実的でない場合に有用です。

### ワークフロー

```shell
# 1. 設定ファイルで新しいルールを有効化した後、現在のエラーをすべて抑制
$ markuplint --suppress "src/**/*.html"

# 2. 生成されたsuppressionsファイルをリポジトリにコミット
$ git add markuplint-suppressions.json

# 3. 以降は新規の違反のみが報告される
$ markuplint "src/**/*.html"

# 4. 既存の違反を修正したら、不要なエントリを削除
$ markuplint --prune-suppressions "src/**/*.html"
```

### 仕組み

`--suppress`コマンドは、現在の`error`レベルの違反を`markuplint-suppressions.json`ファイルに記録します。以降の実行時にこのファイルを読み込み、記録された違反を抑制します。ファイル＋ルールの組み合わせで違反数が抑制カウントを**超えた**場合、その組み合わせの**すべての**違反が報告されます。これにより新しいリグレッションが隠されることを防ぎます。

各エントリには、抑制を特定のDOMサブツリーに絞り込むオプションの**スコープセレクタ**が含まれます。スコープは、すべての違反ノードの[最小共通祖先（LCA: Lowest Common Ancestor）](https://en.wikipedia.org/wiki/Lowest_common_ancestor)を使用して自動的に計算されます。

```json title="markuplint-suppressions.json"
{
  "src/index.html": {
    "attr-duplication": { "count": 3, "scope": "#main-nav > ul" }
  }
}
```

### 主な動作

- `error`レベルの違反のみが抑制対象です。`warning`と`info`は常にパススルーされます
- `--suppress`は常に終了コード0（成功）を返します
- `--suppress`と`--prune-suppressions`は同時に使用できません
- suppressionsファイルはリポジトリにコミットすることを推奨します

### CLIオプション

| オプション                       | 説明                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `--suppress`                     | 現在の全エラー違反を記録                                                         |
| `--suppress-rule <rule>`         | 指定ルールの違反のみ記録                                                         |
| `--prune-suppressions`           | 修正済みの違反のエントリを削除                                                   |
| `--suppressions-location <path>` | suppressionsファイルのカスタムパス（デフォルト: `markuplint-suppressions.json`） |

### スコープセレクタ

スコープセレクタはドキュメントの特定の部分に抑制を絞り込みます。自動的に生成され、以下の戦略が優先順位順に使用されます:

1. **`#id`** — 祖先に`id`属性がある場合
2. **`tag.class`** — 祖先にCSSクラスがある場合
3. **`tag[role="..."]`** — 祖先に`role`属性がある場合（`<input>`の場合は`type`も対象）
4. **`tag:nth-of-type(n)`** — 同名の兄弟要素を区別するため

スコープを絞れない場合（例: 違反がドキュメント全体に分散している場合）、抑制はファイル全体に適用されます。

スコープセレクタが要素にマッチしなくなった場合（例: リファクタリング後）、抑制は維持され`--prune-suppressions`がクリーンアップを推奨します。**壊れたスコープが新しい違反を隠すことはありません。**

## 次のステップ

- **[CLI](/docs/guides/cli)** — `--suppress` や `--prune-suppressions` を含むCLIオプション一覧
- **[ルールを適用する](/docs/guides/applying-rules)** — 完全に無効化する代わりにルールを調整する
- **[設定プロパティ](/docs/configuration/properties)** — `excludeFiles`、`nodeRules`、`childNodeRules`、`overrides` のリファレンス
