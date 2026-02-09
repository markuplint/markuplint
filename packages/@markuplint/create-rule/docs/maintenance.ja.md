# @markuplint/create-rule メンテナンスガイド

## 概要

`@markuplint/create-rule` パッケージは、新しい markuplint ルールのボイラープレートファイルを生成する CLI スキャフォルディングツールです。3つのモードをサポートしています:

- **プロジェクトに追加** — 現在のプロジェクトにローカルプラグインディレクトリを作成
- **パッケージとして公開** — スタンドアロンの npm パッケージをスキャフォルド
- **コアに貢献** — モノレポ内の `@markuplint/rules` にルールを追加

### ファイル構成

```
packages/@markuplint/create-rule/
├── bin/
│   └── create-rule.mjs       # CLI 実行ファイル
├── src/
│   ├── cli.ts                 # 対話ウィザード
│   ├── types.ts               # 型定義
│   ├── create-rule-helper.ts  # 目的ベースルーター
│   ├── create-rule-to-project.ts
│   ├── create-rule-package.ts
│   ├── create-rule-to-core.ts
│   ├── install-scaffold.ts    # スキャフォルドインストーラー
│   └── transfer.ts            # テンプレート処理
└── scaffold/
    ├── core/                  # コアルールテンプレート
    ├── project/               # プロジェクトプラグインテンプレート
    └── package/               # パッケージテンプレート
```

## テンプレートファイルの編集

テンプレートファイルは `scaffold/{core,project,package}/` に配置されています。ユーザーが CLI を実行すると、これらのファイルがプレースホルダーを実際の値に置換してコピーされます。

### プレースホルダー一覧

| プレースホルダー  | 置換内容                       | 入力例         | 出力例         |
| ----------------- | ------------------------------ | -------------- | -------------- |
| `__pluginName__`  | プラグイン名（そのまま）       | `my-plugin`    | `my-plugin`    |
| `__pluginName__c` | プラグイン名（キャメルケース） | `my-plugin`    | `myPlugin`     |
| `__ruleName__`    | ルール名（そのまま）           | `no-empty-alt` | `no-empty-alt` |
| `__ruleName__c`   | ルール名（キャメルケース）     | `no-empty-alt` | `noEmptyAlt`   |
| `__description__` | ルールの説明（コアのみ）       | —              | —              |
| `__category__`    | ルールカテゴリ（コアのみ）     | —              | —              |
| `__severity__`    | デフォルト重大度（コアのみ）   | —              | —              |

### キャメルケース変換

`__<name>__c` サフィックスはキャメルケース変換をトリガーします。ハイフンが除去され、次の文字が大文字化されます。例えば、`__ruleName__c` に値 `no-empty-alt` を指定すると `noEmptyAlt` になります。これは生成コード内の変数名に使用されます。

### ファイル名の置換

テンプレートファイル名に含まれる `__ruleName__` は実際のルール名に置換されます。例えば、`rules/__ruleName__.ts` は `rules/no-empty-alt.ts` になります。

### TypeScript から JavaScript へのトランスパイル

ユーザーが JavaScript を選択した場合、すべての `.ts` テンプレートファイルが TypeScript コンパイラ API で `.js` にトランスパイルされます。テンプレートを編集する際は、生成される TypeScript がトランスパイル後も有効な JavaScript になることを確認してください。

### Prettier フォーマット

生成されるすべてのファイルは Prettier でフォーマットされます。テンプレート内の `// prettier-ignore` コメントはフォーマット前に自動削除されます。これにより、プレースホルダー式がリフォーマットされないようにテンプレート内で `// prettier-ignore` を使用できます。

## CLI フローの変更

対話的な質問シーケンスは `src/cli.ts` で定義されています。新しい質問を追加するには:

1. `@markuplint/cli-utils` のヘルパー（`input()`、`select()`、`confirm()`）を使って質問を追加
2. `src/types.ts` に対応する型を追加（例: `CreateRuleCreatorParams` の新しいフィールド）
3. `createRuleHelper()` の呼び出しに値を渡す
4. 値を `replacer` オプションに渡す必要がある場合は `install-scaffold.ts` を更新
5. 値がスキャフォルド戦略の動作に影響する場合は、関連する戦略ファイルを更新

## i18n の活用

ルール実装を書く際（テンプレートでも実際のルールでも）、ハードコードされた文字列ではなく、ルールコンテキストの `t()` 翻訳関数を使用してすべてのユーザー向けメッセージを生成してください。

### 翻訳関数の使い方

`t()` 関数はすべてのルールの `verify` コンテキストで利用可能です:

```typescript
async verify({ document, report, t }) {
  await document.walkOn('Element', el => {
    report({
      scope: el,
      // t() で文テンプレートとキーワード引数を使用
      message: t('{0} is {1:c}', 'attribute', 'deprecated'),
    });
  });
}
```

文テンプレートとキーワードは `@markuplint/i18n` で定義されています。このアプローチには以下の利点があります:

- 日本語（およびその他のサポート言語）への自動翻訳
- すべてのルールで一貫したメッセージフォーマット
- 補語形式のサポート（日本語の述語接続に使う `:c` フラグ）

### 新しいキーワードやフレーズの追加

ルールに必要なキーワードや文テンプレートが存在しない場合は、`@markuplint/i18n` に追加してください。手順は [i18n メンテナンススキル](../i18n/SKILL.md) を参照してください。主なポイント:

1. キーワードを `locales/ja.json` と `$schema.json` に追加（3ファイル同期ルール）
2. 文テンプレートは `{0}`, `{1}` プレースホルダーで設計
3. 補語形式には `{0:c}`、翻訳スキップには `{0*}` を使用

## 既存ルールの参考

新しいルールを作成する際は、`packages/@markuplint/rules/src/` の既存の実装をパターンやベストプラクティスの参考にしてください。

### 推奨例

シンプルなルール:

- `id-duplication` — 要素走査と重複検出のシンプルな実装
- `class-naming` — 正規表現パターンを使った属性値チェック

i18n を多用するルール:

- `deprecated-attr` — 補語キーワード（`{0:c}`）と複数の文テンプレートを使用
- `required-attr` — 要素/属性コンテキストでのキーワードベースメッセージを実装

`packages/@markuplint/rules/src/` ディレクトリを参照して、作成しようとしているルールに類似した実装を探してください。

## fix 関数について

`fix` 関数は `RuleSeed` のオプションプロパティで、違反の自動修正を可能にします。しかし、多くの既存ルールでは `fix` の実装が不完全または未実装です。新しいルールを作成する際は、まず `verify` 関数に注力してください。`fix` は自動修正の動作が明確で単純な場合にのみ追加してください。

## コマンドリファレンス

| コマンド                                     | 説明               |
| -------------------------------------------- | ------------------ |
| `yarn test --scope @markuplint/create-rule`  | テスト実行         |
| `yarn build --scope @markuplint/create-rule` | パッケージのビルド |
