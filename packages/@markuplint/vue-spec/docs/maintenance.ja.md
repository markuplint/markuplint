# メンテナンスガイド

## コマンド

| コマンド                                  | 説明                   |
| ----------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/vue-spec` | このパッケージをビルド |
| `yarn dev --scope @markuplint/vue-spec`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/vue-spec` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/vue-spec`  | テストを実行           |

## テスト

このパッケージは静的データオブジェクトのみをエクスポートするため、専用のテストファイルはありません。検証は以下の方法で行います:

1. **型チェック** -- `yarn build --scope @markuplint/vue-spec` でビルドし、`ExtendedSpec` 型が満たされていることを確認
2. **統合テスト** -- `yarn test --scope @markuplint/vue-parser` を実行し、スペックが Vue パーサーと正しく動作することを確認

## レシピ

### 1. グローバル属性の追加

1. `src/index.ts` を開く
2. `def['#globalAttrs']['#extends']` 配下に新しいエントリを追加:

   ```ts
   attributeName: {
     type: 'NoEmptyAny',
     description: '属性の説明',
   },
   ```

3. ビルド: `yarn build --scope @markuplint/vue-spec`
4. 統合テスト: `yarn test --scope @markuplint/vue-parser`

### 2. 要素固有のオーバーライドの追加

1. `src/index.ts` を開く
2. `specs` 配列に新しいエントリを追加:

   ```ts
   {
     name: 'element-name',
     possibleToAddProperties: true,
   },
   ```

3. `@markuplint/ml-spec` の `ExtendedSpec` 型で利用可能なオーバーライドフィールドを確認
4. ビルド: `yarn build --scope @markuplint/vue-spec`
5. 統合テスト: `yarn test --scope @markuplint/vue-parser`

### 3. 条件付き属性の追加（CSS セレクタ条件付き）

一部の Vue 属性は、特定の条件を満たす要素にのみ適用されます。`condition` フィールドに CSS セレクタを指定して、属性が利用可能な場面を制限します。

1. `src/index.ts` を開く
2. `def['#globalAttrs']['#extends']` 配下に `condition` 付きの新しいエントリを追加:

   ```ts
   attributeName: {
     type: 'NoEmptyAny',
     description: '条件付き属性の説明',
     condition: '[v-directive]',
   },
   ```

3. `condition` の値は CSS 属性セレクタです。例:
   - `'[v-for]'` -- `v-for` ディレクティブを持つ要素のみ
   - `'[v-model]'` -- `v-model` ディレクティブを持つ要素のみ
4. ビルド: `yarn build --scope @markuplint/vue-spec`
5. 統合テスト: `yarn test --scope @markuplint/vue-parser`

## ExtendedSpec 型リファレンス

`ExtendedSpec` 型（`@markuplint/ml-spec` から提供）は、スペック拡張オブジェクトの構造を定義します:

```
ExtendedSpec
├── def
│   └── #globalAttrs
│       └── #extends
│           └── [attributeName]
│               ├── type           — 属性値の型（例: 'NoEmptyAny'）
│               ├── description    — 人間が読める説明
│               └── condition?     — 属性が適用される場面を制限する CSS セレクタ
└── specs[]
    ├── name                       — 対象の要素名
    └── possibleToAddProperties?   — 要素への動的プロパティの追加を許可
```
