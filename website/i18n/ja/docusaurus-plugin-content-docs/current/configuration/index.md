# 設定

## 設定ファイル

設定ファイルは、適用するルールやオプションを指定するためのものです。通常、自動で読み込みされますが、CLIやAPIを使うことで明示的に期待通りの設定ファイルを読み込めます。

自動読み込みは、**ターゲットが存在するディレクトリから再帰的に検索していきます**。つまり、各ターゲットに最も近い設定ファイルを適用します。

<file-tree>

- 📂 A
  - 📄 .markuplintrc # ①
  - 📂 B
    - 📄 index.html # <- ① A/.markuplintrc が適用される
    - 📂 C
      - 📄 index.html # <- ① A/.markuplintrc が適用される
      - 📂 D
        - 📄 .markuplintrc # ②
        - 📄 index.html # <- ② A/B/C/D/.markuplintrc が適用される

</file-tree>

:::note

**Markuplint**は、最も近いファイルを見つけると検索を中止します。ESLintのデフォルトとは**異なります**。[**ESLint**](https://eslint.org/docs/latest/user-guide/configuring/configuration-files#cascading-and-hierarchy)に`{ "root": true }`と指定したときと同じ動作です。

設定ファイルをより上位のレイヤーに適用したい場合は、`extends`フィールドを指定します。

:::

### ファイル形式とファイル名

ファイル名は`.markuplintrc`でなくても適用できます。

優先的に適用されるファイル名は以下のとおりです。

- `markuplint`プロパティ（`package.json`内）
- `.markuplintrc.json`
- `.markuplintrc.yaml`
- `.markuplintrc.yml`
- `.markuplintrc.js`
- `.markuplintrc.cjs`
- `markuplint.config.js`
- `markuplint.config.cjs`

`.markuplintrc`のフォーマットはJSON（コメント対応）かYAML形式となります。
