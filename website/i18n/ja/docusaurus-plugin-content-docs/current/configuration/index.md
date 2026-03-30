# 設定

## 何を設定すべきか

[VS Code拡張](/docs/guides#the-quickest-way-vs-code-extension)で素のHTMLを使っている場合、**設定ファイルは不要です** — デフォルトで[推奨プリセット](/docs/guides/presets)が適用されます。

設定ファイルが必要になるのは以下の場合です:

- **フレームワークを使う**（React、Vue、Svelteなど） — [`parser`](/docs/configuration/properties#parser)と[`specs`](/docs/configuration/properties#specs)を設定
- **別のプリセットを選ぶ** — [`extends`](/docs/configuration/properties#extends)を設定
- **ルールをカスタマイズする** — [`rules`](/docs/configuration/properties#rules)プロパティでルールをオーバーライド
- **特定の要素にルールを適用する** — [`nodeRules`](/docs/configuration/properties#noderules)や[`childNodeRules`](/docs/configuration/properties#childnoderules)を使用

最小限の設定ファイルは以下のようになります:

```json class=config title=".markuplintrc"
{
  "extends": ["markuplint:recommended"]
}
```

フレームワークプロジェクト（例: React）の場合:

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

実際の設定例は[ユースケース](/docs/configuration/usecases)、すべてのオプションは[プロパティリファレンス](/docs/configuration/properties)を参照してください。

## 設定ファイル

Markuplintは対象ファイルのディレクトリから**上位に向かって再帰的に**設定ファイルを検索します。各ターゲットに最も近い設定ファイルが適用されます。

<FileTree>

- 📂 `A`
  - 📄 `.markuplintrc` # ①
  - 📂 `B`
    - 📄 `index.html` # &lt;- ① `A/.markuplintrc` が適用される
    - 📂 `C`
      - 📄 `index.html` # &lt;- ① `A/.markuplintrc` が適用される
      - 📂 `D`
        - 📄 `.markuplintrc` # ②
        - 📄 `index.html` # &lt;- ② `A/B/C/D/.markuplintrc` が適用される

</FileTree>

:::note

Markuplintは最も近いファイルを見つけると**検索を中止**します。[**ESLint**](https://eslint.org/docs/latest/user-guide/configuring/configuration-files#cascading-and-hierarchy)のデフォルトとは異なり、`{ "root": true }`が設定された場合と同じ動作です。

上位ディレクトリの設定ファイルを継承したい場合は`extends`フィールドを使用してください。

:::

### ファイル形式とファイル名

以下のファイル名が優先順に認識されます:

- `markuplint`プロパティ（`package.json`内）
- `.markuplintrc.json`
- `.markuplintrc.jsonc`
- `.markuplintrc.yaml`
- `.markuplintrc.yml`
- `.markuplintrc.js`
- `.markuplintrc.cjs`
- `.markuplintrc.mjs`
- `.markuplintrc.ts`
- `markuplint.config.js`
- `markuplint.config.cjs`
- `markuplint.config.mjs`
- `markuplint.config.ts`
- `markuplint.config.jsonc`

`.markuplintrc`（拡張子なし）はJSON（コメント対応）とYAML形式をサポートしています。

#### JSON

```json class=config
{
  "extends": ["markuplint:recommended"]
}
```

#### YAML

```yaml class=config
extends:
  - markuplint:recommended
```

#### JavaScript

```js class=config
module.exports = {
  extends: ['markuplint:recommended'],
};
```

#### TypeScript

```ts class=config
import type { Config } from '@markuplint/ml-config';

const config: Config = {
  extends: ['markuplint:recommended'],
};

export default config;
```

## 次のステップ

- **[プロパティ](/docs/configuration/properties)** — すべての設定プロパティのリファレンス
- **[ユースケース](/docs/configuration/usecases)** — 実際の設定例
- **[プリセットを使う](/docs/guides/presets)** — プロジェクトに合ったプリセットを選ぶ
