# メンテナンスガイド

## コマンド

| コマンド                        | 説明                   |
| ------------------------------- | ---------------------- |
| `yarn build --scope markuplint` | このパッケージをビルド |
| `yarn dev --scope markuplint`   | ウォッチモードでビルド |
| `yarn clean --scope markuplint` | ビルド成果物を削除     |
| `yarn test --scope markuplint`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル                     | カバレッジ                                                            |
| ---------------------------------- | --------------------------------------------------------------------- |
| `api/ml-engine.spec.ts`            | MLEngine ライフサイクル（イベント、watch モード、設定解決、fromCode） |
| `cli/index.spec.ts`                | CLI 統合テスト（stdout 出力、fix モード、JSON 形式、フラグ）          |
| `index.spec.ts`                    | パッケージ統合テスト（HTML ファイル linting エンドツーエンド）        |
| `reporter/github-reporter.spec.ts` | GitHub Actions アノテーション出力形式                                 |
| `cli/init/*.spec.ts`               | 初期化ウィザード（設定生成、モジュール選択）                          |
| `i18n.spec.ts`                     | ロケール読み込みとフォールバック動作                                  |

MLEngine テストの主なパターン:

```ts
import { MLEngine } from './api/index.js';

const engine = await MLEngine.fromCode(sourceCode, {
  config: { rules: { 'rule-name': true } },
  locale: 'en',
});
const result = await engine.exec();
expect(result?.violations).toStrictEqual([
  // 期待される違反
]);
```

テストユーティリティを使用したテスト:

```ts
import { mlRuleTest } from './testing-tool/index.js';

const { violations } = await mlRuleTest(ruleSeed, '<div></div>', { rule: true });
expect(violations).toStrictEqual([
  // ruleId を含まない期待される違反
]);
```

## レシピ

### 1. 新しい CLI フラグの追加

1. `src/cli/bootstrap.ts` を読み、`meow()` 内の `flags` オブジェクトを確認
2. 新しいフラグ定義を追加:
   ```ts
   newFlag: {
     type: 'boolean', // または 'string', 'number'
     default: false,
     shortFlag: 'n', // オプション
   },
   ```
3. ファイル上部の `help` 文字列を更新し、新しいフラグをドキュメント化
4. 注意: `CLIOptions` 型は自動更新される（`typeof cli.flags` から推論）
5. `src/cli/command.ts` を読み、`options` からフラグ値を取得:
   ```ts
   const newFlag = options.newFlag;
   ```
6. `command()` 内にフラグの動作を実装、または `MLEngine` オプションに渡す
7. フラグが API レイヤーに影響する場合、`src/api/types.ts` の `APIOptions` に対応プロパティを追加
8. `src/cli/index.spec.ts` にテストを追加
9. ビルド: `yarn build --scope markuplint`
10. テスト: `yarn test --scope markuplint`

### 2. 新しいレポーターの追加

1. `src/reporter/` の既存レポーターを読みパターンを理解:
   - 関数は `MLResultInfo`（およびオプションで `CLIOptions`）を受け取る
   - `string[]` を返す（1要素 = 1出力行）
2. `src/reporter/<name>-reporter.ts` を作成:

   ```ts
   import type { MLResultInfo } from '../types.js';

   export function <name>Reporter(results: MLResultInfo) {
     const out: string[] = [];
     for (const violation of results.violations) {
       out.push(/* 違反をフォーマット */);
     }
     return out;
   }
   ```

3. `src/reporter/index.ts` からエクスポート:
   ```ts
   export * from './<name>-reporter.js';
   ```
4. `src/cli/output.ts` を読み、`switch` 文にケースを追加:
   ```ts
   case '<name>': {
     out = <name>Reporter(results);
     break;
   }
   ```
5. `src/reporter/<name>-reporter.spec.ts` にテストを追加
6. ビルド: `yarn build --scope markuplint`
7. テスト: `yarn test --scope markuplint`

### 3. 設定解決ロジックの変更

1. `src/api/ml-engine.ts` を読み、`resolveConfig()` を確認
2. 現在の優先順位を理解:
   - `options.config`（インライン設定オブジェクト）
   - `options.configFile`（明示的ファイルパス）
   - `ConfigProvider.search()`（自動探索、`--no-search-config` でなければ）
   - `options.defaultConfig`（フォールバック）
   - `markuplint:recommended`（他に設定がない場合のデフォルト）
3. `@markuplint/file-resolver` の `ConfigProvider` を理解:
   - `set(config)` で設定を登録しキーを返す
   - `search(file)` でターゲットに最も近い設定ファイルを検索
   - `resolve(file, keys, cache)` で全設定レイヤーをマージ
4. イベント発行（`this.emit('config', ...)`）を保持しつつ `resolveConfig()` を変更
5. 新しい API オプションを追加する場合、`src/api/types.ts` の `APIOptions` を更新
6. `src/api/ml-engine.spec.ts` にテストを追加
7. ビルド: `yarn build --scope markuplint`
8. テスト: `yarn test --scope markuplint`

### 4. MLEngine イベントの追加

1. `src/api/types.ts` を読み、`MLEngineEventMap` を確認
2. 新しいイベント型定義を追加:
   ```ts
   'new-event': [filePath: string, data: SomeType, message?: string];
   ```
3. `src/api/ml-engine.ts` を読み、パイプラインの適切な箇所に `this.emit('new-event', ...)` を追加
4. `src/api/ml-engine.spec.ts` に `engine.on('new-event', ...)` を使ったテストを追加
5. ビルド: `yarn build --scope markuplint`
6. テスト: `yarn test --scope markuplint`

## 上流パッケージ影響チェックリスト

上流パッケージの変更がこのパッケージに影響する可能性があります:

| パッケージ                  | markuplint への影響                                                            |
| --------------------------- | ------------------------------------------------------------------------------ |
| `@markuplint/file-resolver` | ConfigProvider API の変更、ファイル解決の変更、パーサー/スキーマリゾルバの変更 |
| `@markuplint/ml-config`     | Config 型の変更、mergeConfig の動作変更                                        |
| `@markuplint/ml-core`       | MLCore API の変更、MLRule インターフェースの変更、ViolationCollector の変更    |
| `@markuplint/rules`         | ルールの追加/削除がビルトインルールセットに影響                                |
| `@markuplint/cli-utils`     | CLI 出力ユーティリティの変更、インストーラ API の変更                          |
| `@markuplint/i18n`          | LocaleSet 型の変更、ロケールファイル形式の変更                                 |

上流パッケージが更新された場合:

```shell
yarn test --scope markuplint
```

## トラブルシューティング

### ファイルが linting されない

**症状:** 対象ファイルが存在するが lint 結果が返らない。

**原因:** 拡張子の不一致、または `excludeFiles` でファイルが除外されている。

**解決策:**

1. `--ignore-ext` で拡張子チェックを無効化
2. 設定の `excludeFiles` を確認
3. `--verbose` でどのファイルがスキップされているか、その理由を確認

### 設定が適用されない

**症状:** ルールが有効にならない、設定ファイルが認識されない。

**原因:** `--no-search-config` が設定されている、または設定ファイルが探索パスにない。

**解決策:**

1. `--config` で設定ファイルパスを明示的に指定
2. `--show-config` で計算済み設定を確認
3. 設定ファイルが対象ファイルの親ディレクトリにあることを確認

### Watch モードで設定変更後に再 lint されない

**症状:** 設定ファイルを変更しても再 linting が行われない。

**原因:** 設定ファイルが `configSet.files`（ウォッチャーが追跡するファイルセット）に含まれていない。

**解決策:**

1. `--verbose` でウォッチャーが追跡しているファイルを確認
2. `ConfigProvider.search()` の結果に設定ファイルが含まれていることを確認
3. chokidar がファイルを正しく監視しているか確認（プラットフォーム固有の問題）

### mlTest() で違反が検出されない

**症状:** `mlTest()` が空の violations 配列を返す。

**原因:** 第3引数にカスタム `rules` を渡すと、`importPresetRules` がデフォルトで `false` になる。

**解決策:**

1. `rules` パラメータを省略してすべてのビルトインルールを使用
2. または必要なルールを明示的に渡し、ルール設定でそれらが有効になっていることを確認
