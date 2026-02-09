# メンテナンスガイド

## コマンド

| コマンド                                     | 説明                   |
| -------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/svelte-spec` | このパッケージをビルド |
| `yarn dev --scope @markuplint/svelte-spec`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/svelte-spec` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/svelte-spec`  | テストを実行           |

## テスト

このパッケージは静的なデータオブジェクトのみをエクスポートするため、デフォルトではテストファイルがありません。検証はビルドステップで行われます（TypeScript の型チェックにより、エクスポートされたオブジェクトが `ExtendedSpec` 型に準拠していることが保証されます）。

下流パッケージとの統合を検証するには:

```shell
yarn test --scope @markuplint/svelte-parser
```

## レシピ

### 1. グローバル属性の追加

1. `src/index.ts` を読む
2. spec オブジェクトに `def` プロパティが存在しない場合、追加する:
   ```ts
   const spec: ExtendedSpec = {
     def: {
       '#globalAttrs': {
         '#extends': {
           'new-attribute': {
             type: 'Any',
           },
         },
       },
     },
     specs: [
       // 既存のエントリ...
     ],
   };
   ```
3. `def['#globalAttrs']['#extends']` が既に存在する場合、既存のオブジェクトに新しい属性を追加
4. ビルド: `yarn build --scope @markuplint/svelte-spec`
5. 下流パーサーが正常に動作することを確認: `yarn test --scope @markuplint/svelte-parser`

### 2. 要素固有のオーバーライドの追加

1. `src/index.ts` を読む
2. 対象の要素が `specs` 配列に既にエントリを持っているか確認
3. 要素が存在する場合、その `attributes` オブジェクトに新しい属性を追加:
   ```ts
   {
     name: 'existing-element',
     attributes: {
       existingAttr: { type: 'Any' },
       newAttr: { type: 'Any' },  // ここに追加
     },
   },
   ```
4. 要素が存在しない場合、`specs` 配列に新しいエントリを追加:
   ```ts
   {
     name: 'new-element',
     attributes: {
       'attribute-name': {
         type: 'Any',
       },
     },
   },
   ```
5. ビルド: `yarn build --scope @markuplint/svelte-spec`
6. 下流パーサーが正常に動作することを確認: `yarn test --scope @markuplint/svelte-parser`

## ExtendedSpec 型リファレンス

`ExtendedSpec` 型（`@markuplint/ml-spec` から提供）は以下の構造を持ちます:

```ts
type ExtendedSpec = {
  readonly cites?: Cites; // 参照 URL
  readonly def?: Partial<SpecDefs>; // グローバル定義
  readonly specs?: readonly ExtendedElementSpec[]; // 要素ごとのオーバーライド
};
```

### `def` -- グローバル定義

すべての要素に適用される属性に使用:

```ts
def: {
  '#globalAttrs': {
    '#extends': {
      'attribute-name': {
        type: 'Any',
      },
    },
  },
}
```

### `specs` -- 要素ごとのオーバーライド

`specs` 配列の各エントリは特定の HTML 要素を対象とします:

```ts
specs: [
  {
    name: 'element-name', // HTML タグ名
    attributes: {
      'attribute-name': {
        type: 'Any', // 型オーバーライド
      },
    },
  },
];
```

よく使われる属性型の値:

| 型の値      | 意味                               |
| ----------- | ---------------------------------- |
| `'Any'`     | 任意の型を許容（バインド値に使用） |
| `'String'`  | 文字列値のみ許容                   |
| `'Boolean'` | ブール属性（存在/不在）            |
