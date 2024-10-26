# コマンドラインインターフェイス

## 使い方

```shell
$ markuplint target.html
$ markuplint target.html target2.html
$ markuplint "**/*.html"
```

CLIはターゲットとなるHTMLファイルを可変長引数として受け取ります。また、glob形式も受け付けます。

成功した場合は終了コード`0`を返します。また、1つ以上の問題があった場合は`1`を返します。

## オプション

| 正規形オプション           | 省略形オプション | 引数                                         | デフォルト値 | 解説                                                          |
| -------------------------- | ---------------- | -------------------------------------------- | ------------ | ------------------------------------------------------------- |
| `--config`                 | `-c`             | ファイルパス                                 | なし         | 設定ファイルのパス                                            |
| `--fix`                    | なし             | なし                                         | false        | ルールが対応していれば対象ファイルを修正します                |
| `--format`                 | `-f`             | `JSON`、`Simple`、`GitHub`もしくは`Standard` | `Standard`   | 出力形式                                                      |
| `--no-search-config`       | なし             | なし                                         | false        | 設定ファイルを自動で検索しません                              |
| `--ignore-ext`             | なし             | なし                                         | false        | 拡張子の種類に関わらず受け取ったファイルを評価します          |
| `--no-import-preset-rules` | なし             | なし                                         | false        | 組み込みルールを利用しません                                  |
| `--locale`                 | なし             | 言語コード（例：`ja`）                       | OS設定による | メッセージの言語                                              |
| `--no-color`               | なし             | なし                                         | false        | 出力をカラーリングしません                                    |
| `--problem-only`           | `-p`             | なし                                         | false        | 違反結果のみ出力します                                        |
| `--allow-warnings`         | なし             | なし                                         | false        | `warning`ではステータスコード`0`を返します                    |
| `--no-allow-empty-input`   | なし             | なし                                         | false        | ファイルが見つからなかった場合にステータスコード`1`を返します |
| `--show-config`            | none             | 値なし, `details`                            | 値なし       | 対象ファイルの適用された設定を出力します                      |
| `--verbose`                | なし             | なし                                         | false        | 詳細な情報も同時に出力します                                  |
| `--include-node-modules`   | なし             | なし                                         | false        | `node_module`ディレクトリ内のファイルを含めて評価します       |
| `--severity-parse-error`   | なし             | `error`、`warning`もしくは`off`              | `error`      | パースエラーの深刻度レベルを指定します                        |

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
