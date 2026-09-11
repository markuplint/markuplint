# コマンドラインインターフェイス

## 使い方

```shell
$ markuplint target.html
$ markuplint target.html target2.html
$ markuplint "**/*.html"
```

CLIはターゲットとなるHTMLファイルを可変長引数として受け取ります。また、glob形式も受け付けます。

成功した場合は終了コード`0`を返します。また、1つ以上の問題があった場合は`1`を返します。

`--fix`を指定した場合、終了コードは**修正後の出力に残っている**問題を反映します。すべての問題が修正された場合は`0`を返します。`--fix-dry-run`はファイルを変更しないため、終了コードはディスク上のファイルの状態を反映します。

## オプション

| 正規形オプション           | 省略形オプション | 引数                                         | デフォルト値                   | 解説                                                              |
| -------------------------- | ---------------- | -------------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `--config`                 | `-c`             | ファイルパス                                 | なし                           | 設定ファイルのパス                                                |
| `--fix`                    | なし             | なし                                         | false                          | ルールが対応していれば対象ファイルを修正します                    |
| `--fix-dry-run`            | なし             | なし                                         | false                          | `--fix` の変更内容をファイルを変更せずにプレビューします          |
| `--format`                 | `-f`             | `JSON`、`Simple`、`GitHub`もしくは`Standard` | `Standard`                     | 出力形式                                                          |
| `--no-search-config`       | なし             | なし                                         | false                          | 設定ファイルを自動で検索しません                                  |
| `--ignore-ext`             | なし             | なし                                         | false                          | 拡張子の種類に関わらず受け取ったファイルを評価します              |
| `--no-import-preset-rules` | なし             | なし                                         | false                          | 組み込みルールを利用しません                                      |
| `--locale`                 | なし             | 言語コード（例：`ja`）                       | OS設定による                   | メッセージの言語                                                  |
| `--no-color`               | なし             | なし                                         | false                          | 出力をカラーリングしません                                        |
| `--problem-only`           | `-p`             | なし                                         | false                          | 違反結果のみ出力します                                            |
| `--allow-warnings`         | なし             | なし                                         | true                           | `warning`ではステータスコード`0`を返します                        |
| `--no-allow-empty-input`   | なし             | なし                                         | false                          | ファイルが見つからなかった場合にステータスコード`1`を返します     |
| `--show-config`            | none             | 値なし, `details`                            | 値なし                         | 対象ファイルの適用された設定を出力します                          |
| `--verbose`                | なし             | なし                                         | false                          | 詳細な情報も同時に出力します                                      |
| `--include-node-modules`   | なし             | なし                                         | false                          | `node_module`ディレクトリ内のファイルを含めて評価します           |
| `--severity-parse-error`   | なし             | `error`、`warning`もしくは`off`              | `error`                        | パースエラーの深刻度レベルを指定します                            |
| `--max-count`              | なし             | 数値                                         | `0`                            | 表示する違反数を制限します。`0`は制限なしを意味します             |
| `--max-warnings`           | なし             | 数値                                         | `-1`                           | 警告数の上限を設定します。`-1`は制限なしを意味します              |
| `--no-progressive-output`  | なし             | なし                                         | false                          | 全ファイルの処理完了を待ってから結果をまとめて出力します          |
| `--suppress`               | なし             | なし                                         | false                          | **[実験的]** 現在の全エラー違反をsuppressionsファイルに記録します |
| `--suppress-rule`          | なし             | ルールID                                     | なし                           | **[実験的]** 指定ルールの違反のみ記録します                       |
| `--prune-suppressions`     | なし             | なし                                         | false                          | **[実験的]** suppressionsファイルから不要なエントリを削除します   |
| `--suppressions-location`  | なし             | ファイルパス                                 | `markuplint-suppressions.json` | **[実験的]** suppressionsファイルのカスタムパス                   |

## Particular run

### `--help`

ヘルプを出力します。（省略形オプション: `-h`）

### `--version`

バージョンを出力します。（省略形オプション: `-v`）

### `--init`

初期化をします。[設定](configuration/index.md)ファイルをつくり、モジュールをインストールします。

```shell
$ npx markuplint --init
```

質問に対話的に答えることで、必要なモジュールをインストールします。

### `--max-count`

出力に表示される違反数を制限します。制限に達すると、残りのファイルはスキップされ、出力で「skipped」としてマークされます。このオプションは特に、多くの違反がある既存プロジェクトにMarkuplintを導入する際に、圧倒的な出力を管理し、パフォーマンスを向上させるのに役立ちます。

```shell
# 最初の10件の違反のみを表示
$ markuplint "**/*.html" --max-count=10

# 最初の違反のみを表示
$ markuplint index.html --max-count=1

# 制限なし（デフォルトの動作）
$ markuplint index.html --max-count=0
```

**主な機能:**

- **パフォーマンス最適化**: 制限に達した時点でルール実行を停止し、大規模プロジェクトでのパフォーマンスを向上
- **段階的導入**: 管理可能な数の問題に集中することで段階的な改善を可能に
- **情報表示**: 違反が切り詰められた場合に情報メッセージを表示（標準形式のみ）
- **形式互換性**: すべての出力形式（`--format=json`、`--format=simple`など）でシームレスに動作
- **修正互換性**: `--fix`と併用する場合、完全な修正を保証するため制限は無視される

**段階的改善の使用例:**

1. 現在の違反数を確認: `markuplint "**/*.html" | wc -l` で現在の違反数をカウント
2. 制限を設定: CIで `markuplint "**/*.html" --max-count=50` を実行
3. 徐々に違反を修正し、制限値を減らしていく
4. すべての違反が修正されたら最終的に制限を削除

注意: 制限によりスキップされたファイルは、出力で「skipped」としてマークされ、どのファイルが処理されなかったかが明確にわかります。

### `--max-warnings`

警告数の上限を設定します。警告数が指定した上限を超えた場合、Markuplintは非ゼロの終了コードで終了します。このオプションは既存プロジェクトでのMarkuplintの段階的導入に特に有用です。

```shell
# 警告を10個まで許可
$ markuplint "**/*.html" --max-warnings=10

# 警告を許可しない（厳密モード）
$ markuplint index.html --max-warnings=0

# 制限なし（デフォルトの動作）
$ markuplint index.html --max-warnings=-1
```

**主な機能:**

- **段階的導入**: 警告の閾値を設定することで段階的な改善を可能に
- **ファイル横断集計**: 処理されるすべてのファイルの警告数をカウント
- **CI統合**: 継続的統合での警告制限設定に最適
- **エラー優先**: 警告制限に関係なく、エラーは常に非ゼロ終了コードを引き起こします

**段階的改善の使用例:**

1. 現在の警告を確認: `markuplint "**/*.html" --allow-warnings` ですべての警告を確認
2. 初期制限を設定: CIで `markuplint "**/*.html" --max-warnings=50` を設定
3. 徐々に警告を減らし、制限値を下げていく
4. 最終的に `--max-warnings=0` で警告ゼロを達成

### `--no-progressive-output`

デフォルトでは、すべてのファイルの処理完了を待つ代わりに、各ファイルの処理完了後に即座に結果を出力します。これにより、大量のファイルを処理する際にリアルタイムフィードバックを提供し、CLIがフリーズしているように見えることを防ぎます。従来の一括出力に戻すには `--no-progressive-output` を指定してください。

```shell
# 各ファイルの処理完了後に即座に結果を出力（デフォルト）
$ markuplint "**/*.html"

# すべてのファイルの処理完了を待ってから結果をまとめて出力
$ markuplint "**/*.html" --no-progressive-output
```

**主な機能:**

- **リアルタイムフィードバック**: 各ファイルの処理完了と同時に結果を確認
- **UX向上**: 大量ファイル処理中のCLIフリーズ感を防止
- **JSON形式例外**: JSON出力はこの設定に関係なく常に一括モードを使用
- **suppressions例外**: 有効な[suppressions](#suppress)ファイルにエントリが存在する場合、どの違反が抑制されるかは全ファイルの処理完了後にしか確定しないため、実行全体が一括モードにフォールバックします
- **`--max-count`例外**: `--max-count`を指定した場合、上限はファイル単位ではなく実行全体に適用されるため、実行全体が一括モードにフォールバックします
- **パフォーマンス**: パフォーマンスへの影響はなく、出力タイミングのみ変更

**`--no-progressive-output`を使う場面:**

- 従来の一括サマリー出力をパースするスクリプト
- v4の出力順序を再現したい場合

### `--suppress` / `--suppress-rule` {#suppress}

:::caution 実験的機能
この機能は実験的であり、今後のリリースで変更される可能性があります。
:::

既存の違反をsuppressionsファイルに記録し、新規コードに対してのみルールを適用します。詳しくは[一括抑制](./ignoring-code.md#bulk-suppressions)を参照してください。

```shell
# 現在の全エラー違反を抑制
$ markuplint "**/*.html" --suppress

# 特定のルールのみ抑制
$ markuplint "**/*.html" --suppress-rule no-duplicate-attr

# カスタムパスでsuppressionsファイルを指定
$ markuplint "**/*.html" --suppress --suppressions-location .config/suppressions.json
```

### `--prune-suppressions` {#prune-suppressions}

:::caution 実験的機能
この機能は実験的であり、今後のリリースで変更される可能性があります。
:::

修正済みの違反に対応する不要なエントリをsuppressionsファイルから削除します。

```shell
$ markuplint "**/*.html" --prune-suppressions
```

## 次のステップ

- **[コードを無視する](/docs/guides/ignoring-code)** — 違反の抑制、特定の要素やファイルのルール無効化
- **[設定](/docs/configuration)** — 設定ファイルの形式とプロパティ
- **[FAQ](/docs/guides/faq)** — よくある質問とトラブルシューティング
