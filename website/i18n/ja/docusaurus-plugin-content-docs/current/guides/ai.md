# AIと使う

AIコーディングアシスタントを活用すると、Markuplintをより効果的に使えます — 警告の理解から設定ファイルの作成まで。

## 警告を理解する

Markuplintが違反を報告したら、エラーメッセージをAIアシスタントに貼り付けて、説明と修正方法を聞くことができます。各違反にはルール名（例: `no-duplicate-attr`）が含まれており、AIが内容を調べてくれます。

```
The attribute name is duplicated Markuplint(no-duplicate-attr) [Ln 11, Col 45]
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
npx skills add markuplint/markuplint@migrate4-5
```

### 利用可能なスキル

| スキル                 | タイプ             | 説明                                                                                                                   |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `markuplint`           | 自動読み込み       | リファレンスナレッジ — 違反メッセージの解釈、CLI使用法、設定パターン。HTMLファイルの作業時にClaudeが自動的に参照。     |
| `markuplint-setup`     | スラッシュコマンド | ゼロからのセットアップ — フレームワーク検出、プリセット選択、初回リント、Bulk Suppressionsを含むルールごとの採用判断。 |
| `markuplint-configure` | スラッシュコマンド | ルールの追加・削除・調整 — 適切なスコープ（プロジェクト / ファイル / 要素）を判断して設定変更を提案。                  |
| `migrate4-5`           | 自動ロード         | Markuplint v4からv5への移行 — 破壊的変更を確認し、パッケージと設定を段階的に更新。                                     |

### 使い方

**自動読み込みスキル（`markuplint`）:** 特別な操作は不要です。インストールすると、HTMLやMarkuplintの設定ファイルを扱う際にClaudeが自動的にこのナレッジを参照します。違反の解釈、修正の提案、正しい設定の作成に役立ちます。

**スラッシュコマンドスキル:** Claude Codeでコマンドを入力すると対話型ワークフローが始まります:

- `/markuplint-setup` — 「Markuplintを導入して」
- `/markuplint-setup "src/**/*.tsx"` — ターゲットglobを指定してセットアップ
- `/markuplint-configure` — 「Markuplintのルールを変更したい」
- `/markuplint-configure src/components/Header.tsx:15` — 特定のファイルと行のルールを調整

## 次のステップ

- **[はじめる](/docs/guides)** — VS Code拡張をインストールしてリントを開始する
- **[HTML以外で使う](/docs/guides/beyond-html)** — フレームワーク用のパーサーを設定する
- **[設定](/docs/configuration)** — 利用可能なすべての設定オプションについて
