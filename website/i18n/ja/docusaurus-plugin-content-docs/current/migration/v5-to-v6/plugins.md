---
sidebar_position: 2
title: 'プラグインの仕組み'
---

# プラグインの仕組み

プラグインの仕組みは削除されました。ルールは組み込みの`@markuplint/rules`のものだけです。

`parser`と`specs`のプロパティ、およびパーサーとスペックのパッケージ（パーサープラグイン、スペックプラグインとも呼ばれます）は影響を受けません。

## 設定 {#config}

`plugins`と`extends: ["plugin:<name>/<config>"]`は削除されました。これらが残っている設定は黙って受け入れられることはなく、`config-error`の警告になります。

```
"plugins" is not supported: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins)
"plugin:<name>/<config>" cannot be extended: the plugin mechanism was removed in v6 (https://markuplint.dev/docs/migration/v5-to-v6/plugins)
```

変更前:

```json
{
  "extends": ["markuplint:recommended", "plugin:my-plugin/recommended"],
  "plugins": ["my-plugin"],
  "rules": {
    "my-plugin/my-rule": true
  }
}
```

変更後:

```json
{
  "extends": ["markuplint:recommended"]
}
```

`rules`に残っているプラグインのルールも、`Rule not found: my-plugin/my-rule`として報告されます。

スラッシュを含むルール名は「プラグインのルール」を意味しなくなりました。[名前付きルールグループ](/docs/configuration/properties#named-rule-groups)（`namespace/name`と`{ "rules": { … } }`の値）か、`namespace/*: false`のワイルドカードです。

## ルール {#rules}

ルールは組み込みの`@markuplint/rules`以外から読み込めません。

- `@markuplint/rule-<name>`や`markuplint-rule-<name>`という名前のパッケージからルールは読み込まれません。
- `markuplint --create-rule`とパッケージ`@markuplint/create-rule`は削除されました。
- `--show-config=details`は`plugins`を出力しなくなり、`@markuplint/file-resolver`の`ConfigSet.plugins`は削除されました。

## CLI {#cli}

削除されたフラグを指定すると、終了コード1とこのページを示すメッセージで終了します。フラグを渡したままのスクリプトが、黙って別の検査をすることはありません。

| フラグ                     | v6   |
| -------------------------- | ---- |
| `--no-import-preset-rules` | 削除 |
| `--create-rule`            | 削除 |

## API {#api}

削除されたオプション`rules`・`importPresetRules`を`lint()`や`MLEngine`に渡すと、`TypeError`を投げます。

| 削除されたもの                                                             | 備考                       |
| -------------------------------------------------------------------------- | -------------------------- |
| オプション`rules`（独自の`MLRule`）                                        | 組み込みルールだけが動く。 |
| オプション`importPresetRules`                                              |                            |
| オプション`autoLoad`（非推奨だったもの）                                   |                            |
| `@markuplint/ml-core`の`createPlugin()`                                    |                            |
| `@markuplint/ml-core`の型`Plugin`、`PluginCreator`、`CreatePluginSettings` |                            |
| `@markuplint/ml-config`の型`PluginConfig`                                  |                            |
| `@markuplint/file-resolver`の`ConfigSet.plugins`                           |                            |

### テスト用API {#testing-api}

`mlTest`と`mlTestFile`から引数`rules`が削除されました。

| v5                                                   | v6                                           |
| ---------------------------------------------------- | -------------------------------------------- |
| `mlTest(sourceCode, config, rules?, locale?, fix?)`  | `mlTest(sourceCode, config, locale?, fix?)`  |
| `mlTestFile(target, config?, rules?, locale?, fix?)` | `mlTestFile(target, config?, locale?, fix?)` |

JavaScriptからの呼び出しで、第3引数にルールの配列を渡したままだと`TypeError`を投げます。第3引数はロケールになりました。

`mlRuleTest`が受け取るのは、`@markuplint/rules`のレジストリにあるルールのシードだけです。それ以外は`TypeError`を投げます。

## 対応方法 {#what-to-do}

1. 設定から`plugins`と`extends`の`plugin:`、`rules`のプラグインのルールを削除します。
2. 自作したルールは動かなくなります。組み込みルールにできるよう、Markuplintに提案してください。[Issueを立てる](https://github.com/markuplint/markuplint/issues)か、プルリクエストを送ります。それまでは、そのチェックに別のツールを使ってください。
3. スクリプトやテストから、削除されたCLIフラグとAPIオプションを外し、`mlTest`と`mlTestFile`の呼び出しを更新します。
