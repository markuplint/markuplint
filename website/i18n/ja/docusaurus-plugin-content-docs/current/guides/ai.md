# AIと使う

AIコーディングアシスタントを活用すると、Markuplintをより効果的に使えます — 警告の理解から設定ファイルの作成まで。

## 警告を理解する

Markuplintが違反を報告したら、エラーメッセージをAIアシスタントに貼り付けて、説明と修正方法を聞くことができます。各違反にはルール名（例: `attr-duplication`）が含まれており、AIが内容を調べてくれます。

```
The attribute name is duplicated Markuplint(attr-duplication) [Ln 11, Col 45]
```

AIアシスタントに聞いてみましょう:

- 「このMarkuplintの警告はどういう意味？」
- 「`permitted-contents` を解消するにはHTMLをどう修正すればいい？」

## 設定ファイルを書く

AIアシスタントに、プロジェクトに合わせたMarkuplintの設定ファイルを生成してもらえます。環境を説明して設定を作ってもらいましょう:

- 「Reactプロジェクト用の `.markuplintrc` を作って」
- 「BEMクラス命名を強制するルールをMarkuplintの設定に追加して」
- 「`data-testid` 属性を許可するようにMarkuplintを設定して」

## AIコーディングエージェント

[Claude Code](https://claude.ai/claude-code)、[Cursor](https://www.cursor.com/)、[GitHub Copilot](https://github.com/features/copilot)などのAIコーディングエージェントは、開発ワークフローの中で直接Markuplintを実行できます:

1. **生成コードのリント** — HTML生成後に `npx markuplint` を実行するようエージェントに依頼
2. **違反の自動修正** — エージェントがMarkuplintの出力を解釈して修正を適用
3. **プロジェクトのセットアップ** — エージェントがフレームワークに合わせて `.markuplintrc` ファイルを直接作成

:::info
`npx markuplint --init` は対話式のため、手動入力が必要です。AIエージェントは設定ファイルを直接書く方が確実です。パーサーとスペックパッケージについては[HTML以外で使う](/docs/guides/beyond-html)を参照してください。
:::

## Claude Code 向けスキル

Markuplintは[Claude Code](https://claude.ai/claude-code)向けのインストール可能な[スキル](https://github.com/markuplint/markuplint/tree/dev/skills)を提供しています。エージェントがよくあるワークフローをガイドします。

### インストール

```shell
npx skills add markuplint/markuplint@markuplint
npx skills add markuplint/markuplint@markuplint-setup
npx skills add markuplint/markuplint@markuplint-configure
```

### 利用可能なスキル

| スキル                 | 使い方                   | 説明                                                                                                                   |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `markuplint`           | HTML作業時に自動読み込み | リファレンスナレッジ — 違反メッセージの解釈、CLI使用法、設定パターン。                                                 |
| `markuplint-setup`     | `/markuplint-setup`      | ゼロからのセットアップ — フレームワーク検出、プリセット選択、初回リント、Bulk Suppressionsを含むルールごとの採用判断。 |
| `markuplint-configure` | `/markuplint-configure`  | ルールの追加・削除・調整 — 適切なスコープ（プロジェクト / ファイル / 要素）を判断して設定変更を提案。                  |

## 次のステップ

- **[はじめる](/docs/guides)** — VS Code拡張をインストールしてリントを開始する
- **[HTML以外で使う](/docs/guides/beyond-html)** — フレームワーク用のパーサーを設定する
- **[設定](/docs/configuration)** — 利用可能なすべての設定オプションについて
