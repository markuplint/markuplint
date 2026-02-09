# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/react-spec` | このパッケージをビルド |
| `yarn dev --scope @markuplint/react-spec`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/react-spec` | ビルド成果物を削除     |

## テスト

このパッケージには専用のテストスイートはありません。`ExtendedSpec` オブジェクトは、`@markuplint/ml-spec` の `ExtendedSpec` 型に対する TypeScript 型チェックにより、ビルド時に検証されます。エクスポートされたオブジェクトが型に適合しない場合、ビルドが失敗します。

統合テストは下流で行われます:

- `@markuplint/ml-spec` が拡張仕様を解決し、基本 HTML 仕様とマージ
- `@markuplint/ml-core` がリント時に解決済み仕様を使用し、属性定義を実行

変更を検証するには、パッケージをビルドして下流のテストを実行します:

```shell
yarn build --scope @markuplint/react-spec
yarn test --scope @markuplint/ml-spec --scope @markuplint/ml-core
```

## レシピ

### 1. グローバル属性の追加

グローバル属性はすべての JSX 要素で利用可能です。

1. `src/index.ts` を開く
2. `def['#globalAttrs']['#extends']` の下に新しいエントリを追加:
   ```ts
   /** 属性の説明 */
   attributeName: {
       type: 'Any', // または 'Boolean'
   },
   ```
3. 適切な型を選択:
   - `'Any'` -- 任意の値を受け付ける（文字列、式など）
   - `'Boolean'` -- ブール属性（存在が `true` を意味する）
4. ビルド: `yarn build --scope @markuplint/react-spec`

### 2. 要素固有のオーバーライドの追加

要素オーバーライドは、特定の HTML 要素でのみ利用可能な属性を定義します。

1. `src/index.ts` を開く
2. `specs[]` 配列で対象の要素を探す。存在しない場合は新しいエントリを追加:
   ```ts
   {
       name: 'elementName',
       attributes: {
           /** 属性の説明 */
           attributeName: {
               type: 'Any',
           },
       },
   },
   ```
3. 要素が既に存在する場合は、その `attributes` オブジェクトに新しい属性を追加
4. ビルド: `yarn build --scope @markuplint/react-spec`

### 3. 条件付き属性の追加

条件付き属性は、要素が CSS セレクタ条件に一致する場合にのみ有効です。

1. `src/index.ts` を開く
2. `specs[]` 配列で要素エントリを見つけるか作成
3. `condition` 配列を持つ属性を追加:
   ```ts
   attributeName: {
       type: 'Boolean',
       caseSensitive: true,
       condition: ['[type=checkbox]', '[type=radio]'],
   },
   ```
4. `condition` 配列は CSS 属性セレクタ構文を使用
5. 複数の条件は OR として扱われる -- いずれかの条件に一致すれば属性は有効
6. 属性名の大文字小文字を区別する必要がある場合は `caseSensitive: true` を設定（React JSX 属性では一般的）
7. ビルド: `yarn build --scope @markuplint/react-spec`

## ExtendedSpec 型リファレンス

`ExtendedSpec` 型（`@markuplint/ml-spec` から）は、このパッケージに関連する以下の構造を持ちます:

```ts
interface ExtendedSpec {
  def?: {
    '#globalAttrs'?: {
      '#extends': Record<string, AttributeSpec>;
    };
  };
  specs?: Array<{
    name: string;
    attributes: Record<string, AttributeSpec>;
  }>;
}
```

### AttributeSpec のフィールド

| フィールド      | 型         | 必須   | 説明                                    |
| --------------- | ---------- | ------ | --------------------------------------- |
| `type`          | `string`   | はい   | 属性値の型（`'Any'`、`'Boolean'` など） |
| `caseSensitive` | `boolean`  | いいえ | 属性名の大文字小文字を区別するかどうか  |
| `condition`     | `string[]` | いいえ | 属性が適用される CSS セレクタ条件       |

### 型の値

- `'Any'` -- 属性は任意の値を受け付ける
- `'Boolean'` -- 属性はブール値（存在が `true` を示す）
