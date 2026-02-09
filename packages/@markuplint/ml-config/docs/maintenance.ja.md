# メンテナンスガイド

## コマンド

| コマンド                                   | 説明                   |
| ------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/ml-config` | このパッケージをビルド |
| `yarn dev --scope @markuplint/ml-config`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/ml-config` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/ml-config`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル         | カバレッジ                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `merge-config.spec.ts` | `mergeConfig()` 統合テスト（plugins, parser, overrides, rules）、`mergeRule()` エッジケース、pretender マージ |
| `utils.spec.ts`        | `provideValue()` テンプレートレンダリング、`exchangeValueOnRule()` の value/options/reason 処理               |

マージテストの主なパターン:

```ts
import { mergeConfig, mergeRule } from './merge-config.js';

expect(mergeConfig(baseConfig, overrideConfig)).toStrictEqual({
  // 期待されるマージ結果
});
```

ルールマージのテスト:

```ts
expect(mergeRule(baseRule, overrideRule)).toStrictEqual({
  // 期待されるマージ済みルール
});
```

テンプレートレンダリングのテスト:

```ts
import { provideValue, exchangeValueOnRule } from './utils.js';

expect(provideValue('{{ dataName }}', { dataName: 'value' })).toBe('value');
expect(exchangeValueOnRule({ value: '{{ var }}' }, { var: 'x' })).toStrictEqual({ value: 'x' });
```

## レシピ

### 1. Config 型への新しいプロパティ追加

1. `src/types.ts` を読み、`Config` 型を確認
2. `Config` に新しい readonly プロパティを追加:
   ```ts
   readonly newProp?: NewPropType;
   ```
3. `OptimizedConfig` に含めるかどうかを判断:
   - マージ後に型が変わる場合（plugins の string -> object のように）、`Omit` + 再定義を使用
   - 型が同じなら `OptimizedConfig` のスプレッドで自動的に継承される
4. `OverrideConfig` に含めるかどうかを判断:
   - トップレベル専用（`$schema`、`extends` のように）なら、`NoInherit` ユニオン型にプロパティ名を追加
   - ファイルパターンごとにオーバーライド可能にする場合はそのまま（`Omit<Config, NoInherit>` 経由で `Config` から継承）
5. `src/merge-config.ts` を読み、`mergeConfig()` 関数の config オブジェクト内にマージロジックを追加:
   - オブジェクト deep merge: `newProp: mergeObject(a.newProp, b.newProp)`
   - 配列結合: `newProp: concatArray(a.newProp, b.newProp)`
   - 配列結合+重複排除: `newProp: concatArray(a.newProp, b.newProp, true)`
   - 単純な右辺優先: `newProp: b.newProp ?? a.newProp`（スプレッドで処理されるが、明示的な方が分かりやすい）
6. `src/merge-config.spec.ts` にテストケースを追加
7. ビルド: `yarn build --scope @markuplint/ml-config`
8. テスト: `yarn test --scope @markuplint/ml-config`

### 2. マージ戦略の変更

1. `src/merge-config.ts` を読み、`mergeConfig()` 関数内のプロパティを確認
2. 現在の戦略を特定（`ARCHITECTURE.md` の戦略テーブルを参照）
3. マージ呼び出しを置換。利用可能な戦略:
   - `mergeObject(a.prop, b.prop)` -- 右辺優先の deep merge
   - `concatArray(a.prop, b.prop)` -- 単純な配列結合
   - `concatArray(a.prop, b.prop, true)` -- 重複排除付き結合
   - `concatArray(a.prop, b.prop, true, 'name')` -- 名前付きプロパティで重複排除、同名オブジェクトをマージ
   - `b.prop ?? a.prop` -- 単純な右辺優先（マージなし）
   - カスタムヘルパー関数（複雑な変換用）
4. `src/merge-config.spec.ts` のテストを更新または追加
5. ビルド: `yarn build --scope @markuplint/ml-config`
6. テスト: `yarn test --scope @markuplint/ml-config`

### 3. ルールマージロジックの変更

1. `src/merge-config.ts` を読み、`mergeRule()` 関数を確認
2. 現在のフローを理解:
   - `optimizeRule()` が両方の入力を正規化（非推奨の `option` -> `options` を処理）
   - `false` チェック: override が `false` または `{value: false}` なら常に `false` を返す
   - `undefined` チェック: 片方がない場合はもう片方を返す
   - 値型チェック: override が直接値（primitive/null/array）なら置換または連結
   - オブジェクト型マージ: severity/value/reason は右辺優先、options は deep merge
3. 変更を加える際、主要な不変条件を保持:
   - `false` は常に絶対無効化になる必要がある
   - 配列値は連結される（置換ではない）
   - `options` は `mergeObject()` による deep merge が必要
4. `src/merge-config.spec.ts` の既存テストが通ることを確認
5. 変更後の動作に対する新しいテストケースを追加
6. ビルド: `yarn build --scope @markuplint/ml-config`
7. テスト: `yarn test --scope @markuplint/ml-config`

### 4. Pretender 型の拡張

1. `src/types.ts` を読み、`Pretender`、`PretenderDetails`、`OriginalNode` を確認
2. 適切な型に新しいフィールドを追加
3. `src/merge-config.ts` を読み、`mergePretenders()` を確認:
   - 配列形式を `{data: [...]}` に変換（`convertPretenersToDetails()`）
   - `mergeObject()` で deep merge
   - `PretenderDetails` の新しいフィールドは自動的に deep merge される
   - `Pretender`（`data` 配列内）の新しいフィールドは deepmerge の配列マージで処理
4. `src/merge-config.spec.ts` にテストケースを追加
5. ビルド: `yarn build --scope @markuplint/ml-config`
6. テスト: `yarn test --scope @markuplint/ml-config`

## 上流パッケージ影響チェックリスト

上流パッケージの変更がこのパッケージに影響する可能性があります:

| パッケージ             | ml-config への影響                                   |
| ---------------------- | ---------------------------------------------------- |
| `@markuplint/ml-ast`   | `ParserOptions` 型の変更                             |
| `@markuplint/selector` | `RegexSelector` 型の変更（再エクスポートされている） |
| `@markuplint/shared`   | `Nullable` ユーティリティ型の変更                    |

上流パッケージが更新された場合:

```shell
yarn test --scope @markuplint/ml-config
```

## トラブルシューティング

### マージ後にプロパティが消える

**症状:** 入力設定にプロパティが存在するが、`mergeConfig()` の結果に含まれない。

**原因:** `deleteUndefProp()` が `undefined` 値のプロパティをすべて除去している。マージロジックがそのプロパティに対して `undefined` を生成している可能性がある。

**解決策:**

1. `mergeConfig()` 内のそのプロパティのマージ戦略を確認
2. 両方の入力に値がある場合にヘルパー関数が `undefined` を返していないか検証
3. `concatArray()` は空配列に対して `undefined` を返す -- 入力が空でないことを確認

### ルール値が上書きではなく連結される

**症状:** ルールの配列値が上書きされずに増え続ける。

**原因:** `mergeRule()` はベースとオーバーライドの両方が配列の場合、設計上連結する。

**解決策:** 配列値を完全に上書きするには、override 側でオブジェクト形式を使用:

```json
{ "value": ["new", "values"], "options": {} }
```

これにより連結ではなく値が完全に置換される。

### プラグインの settings がマージされない

**症状:** 同名プラグインの2つの設定で、片方の settings しか反映されない。

**原因:** 片方が文字列形式（`"plugin-name"`）、もう片方がオブジェクト形式（`{name: "plugin-name", settings: {...}}`）の場合、文字列形式にはマージする settings がない。

**解決策:** 両方でオブジェクト形式を使用:

```json
{ "name": "plugin-name", "settings": { "key": "value" } }
```

### false でルールを無効化できない

**症状:** ローカル設定でルールを `false` に設定しても、extends を使用していると無効化されない。

**原因:** `mergeConfig()` の呼び出し順序が逆になっている可能性がある。ローカル設定は第2引数（override）でなければならない。

**解決策:** 呼び出し順序が `mergeConfig(extendedConfig, localConfig)` であることを確認。ローカル設定が右辺（override）引数になるようにする。
