# メンテナンスガイド

## コマンド

| コマンド                                       | 説明                   |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/datastar-spec` | このパッケージをビルド |
| `yarn dev --scope @markuplint/datastar-spec`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/datastar-spec` | ビルド成果物を削除     |

## テスト

このパッケージには専用のテストスイートはありません。`ExtendedSpec` オブジェクトは、`@markuplint/ml-spec` の `ExtendedSpec` 型に対する TypeScript 型チェックにより、ビルド時に検証されます。エクスポートされたオブジェクトが型に適合しない場合、ビルドが失敗します。

統合テストは下流で行われます:

- `@markuplint/ml-spec` が拡張仕様を解決し、基本 HTML 仕様とマージ
- `@markuplint/ml-core` がリント時に解決済み仕様を使用し、属性定義を実行

変更を検証するには、パッケージをビルドして下流のテストを実行します:

```shell
yarn build --scope @markuplint/datastar-spec
yarn test @markuplint/ml-spec @markuplint/ml-core
```

## レシピ

### 1. グローバル属性の追加

Datastar の属性はすべてグローバルです -- すべての HTML 要素で利用可能です。

1. `src/index.ts` を開く
2. `def['#globalAttrs']['#extends']` の下に新しいエントリを追加:
   ```ts
   /** 属性の説明 */
   'data-attributeName': {
       type: 'Any', // または 'Boolean'
   },
   ```
3. 適切な型を選択:
   - `'Any'` -- 任意の値を受け付ける（文字列、式など）
   - `'Boolean'` -- ブール属性（存在が `true` を意味する）
4. ビルド: `yarn build --scope @markuplint/datastar-spec`

## ExtendedSpec 型リファレンス

`ExtendedSpec` 型（`@markuplint/ml-spec` から）は、このパッケージに関連する以下の構造を持ちます:

```ts
interface ExtendedSpec {
  cites?: string[];
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
