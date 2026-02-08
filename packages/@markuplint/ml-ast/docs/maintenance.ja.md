# メンテナンスガイド

`@markuplint/ml-ast` の実践的な操作・メンテナンスガイドです。

## コマンド

| コマンド                                      | 説明                              |
| --------------------------------------------- | --------------------------------- |
| `yarn build --scope @markuplint/ml-ast`       | TypeScript を `lib/` にコンパイル |
| `yarn workspace @markuplint/ml-ast run dev`   | ウォッチモードコンパイル          |
| `yarn workspace @markuplint/ml-ast run clean` | コンパイル出力をクリーン          |

## テスト

このパッケージには**テストファイルがありません**。純粋な型定義パッケージのため、正当性はビルド時に TypeScript コンパイラで検証されます。統合テストはこれらの型を消費する下流パッケージで実施されます。

型の正当性を検証するには：

```bash
yarn build --scope @markuplint/ml-ast
```

## 一般的なレシピ

### 1. 新しいノード型の追加

新しい AST ノード型（例：仮想的な `MLASTDirective`）を追加する場合：

1. **`MLASTNodeType` に型の値を追加**（`src/types.ts`）：

   ```typescript
   export type MLASTNodeType =
     | 'doctype'
     | 'starttag'
     // ... 既存の値
     | 'directive'; // ここに追加
   ```

2. **`MLASTAbstractNode` を継承するインターフェースを定義**：

   ```typescript
   export interface MLASTDirective extends MLASTAbstractNode {
     readonly type: 'directive';
     readonly depth: number;
     // 型固有のフィールドを追加
   }
   ```

3. **関連する共用体型に追加**：
   - `MLASTNode` -- 常にこの共用体に追加
   - `MLASTChildNode` -- 要素の子になれる場合
   - `MLASTNodeTreeItem` -- `nodeList` のトップレベルに出現できる場合
   - `MLASTParentNode` -- 子ノードを含むことができる場合

4. **`ml-core` の `createNode()` を更新**（`packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts`）：
   - `switch` 文に新しい type 値の `case` を追加
   - 適切な DOM ノードクラスを作成または再利用

5. **このノード型を生成するパーサーを更新**

6. **ビルドして検証**：
   ```bash
   yarn build --scope @markuplint/ml-ast
   yarn build --scope @markuplint/ml-core
   ```

### 2. 既存ノード型へのフィールド追加

既存のノードインターフェースに新しいフィールドを追加する場合：

1. **`src/types.ts` のインターフェースにフィールドを追加**：

   ```typescript
   export interface MLASTElement extends MLASTAbstractNode {
     // ... 既存のフィールド
     readonly newField: string; // 必須フィールド
     readonly optionalField?: boolean; // オプションフィールド（後方互換性のため推奨）
   }
   ```

2. **後方互換性のためオプションフィールド**（`?`）を推奨 -- フィールドがなくても既存のパーサーが壊れません。

3. **新しいフィールドを設定するパーサーを更新**

4. **フィールドが DOM ノードの作成や動作に影響する場合は `ml-core` を更新**

5. **全チェーンをビルド**：
   ```bash
   yarn build --scope @markuplint/ml-ast
   yarn build --scope @markuplint/ml-core
   ```

### 3. 新しい属性バリアントの追加

`MLASTHTMLAttr` と `MLASTSpreadAttr` に加えて新しい属性型を追加する場合：

1. **`MLASTNodeType` に型の値を追加**（まだない場合）

2. **`MLASTToken` を継承するインターフェースを定義**：

   ```typescript
   export interface MLASTNewAttr extends MLASTToken {
     readonly type: 'newattr';
     readonly nodeName: string;
     // 属性固有のフィールドを追加
   }
   ```

3. **`MLASTAttr` 共用体に追加**：

   ```typescript
   export type MLASTAttr = MLASTHTMLAttr | MLASTSpreadAttr | MLASTNewAttr;
   ```

4. **属性型で switch する下流の消費者を更新**

5. **ビルドして検証**

### 4. `PreprocessorSpecificBlockConditionalType` の値追加

プリプロセッサブロックの新しい conditional type 値を追加する場合：

1. **`src/types.ts` の `MLASTPreprocessorSpecificBlockConditionalType` に値を追加**：

   ```typescript
   export type MLASTPreprocessorSpecificBlockConditionalType =
     | 'if'
     | 'if:elseif'
     // ... 既存の値
     | 'newvalue' // ここに追加
     | null;
   ```

2. **この conditional type でブロックを生成するパーサーを更新**

3. **新しい値が DOM 作成時に特別な処理を必要とする場合は `ml-core` を更新**

4. **ビルドして検証**：
   ```bash
   yarn build --scope @markuplint/ml-ast
   ```

### 5. `MLParser` インターフェースの変更

パーサーインターフェースを変更する場合：

1. **`src/types.ts` の `MLParser` を変更**

2. **後方互換性を考慮**：
   - オプションフィールドの追加は安全
   - 必須フィールドの追加やシグネチャの変更は破壊的変更
   - 一貫性のため必要に応じて `MLMarkupLanguageParser`（非推奨）も更新

3. **すべてのパーサー実装を更新**：
   - `@markuplint/html-parser`
   - `@markuplint/jsx-parser`
   - `@markuplint/vue-parser`
   - `@markuplint/svelte-parser`
   - `@markuplint/astro-parser`
   - `@markuplint/pug-parser`
   - `@markuplint/parser-utils`

4. **影響を受けるすべてのパッケージをビルド**：
   ```bash
   yarn build
   ```

## 下流影響チェックリスト

このパッケージの型を変更する際、以下の下流パッケージがビルド・テストに通ることを確認してください：

- [ ] `@markuplint/html-parser` -- HTML パーサー
- [ ] `@markuplint/parser-utils` -- パーサーユーティリティ関数
- [ ] `@markuplint/jsx-parser` -- JSX パーサー
- [ ] `@markuplint/astro-parser` -- Astro パーサー
- [ ] `@markuplint/vue-parser` -- Vue SFC パーサー
- [ ] `@markuplint/svelte-parser` -- Svelte パーサー
- [ ] `@markuplint/pug-parser` -- Pug パーサー
- [ ] `@markuplint/ml-core` -- コア DOM マッピング（最重要）
- [ ] `@markuplint/ml-config` -- 設定型
- [ ] `@markuplint/ml-spec` -- 仕様型
- [ ] `@markuplint/file-resolver` -- ファイル解決

最も重要な下流パッケージは `@markuplint/ml-core` で、`createNode()` -- `node.type` に対する `switch` 文で AST ノードを DOM ノードにマッピングする関数を含みます。

## トラブルシューティング

### 型変更後のビルドエラー

**症状：** 型の変更後、下流パッケージのビルドが失敗する。

**診断：**

1. まずこのパッケージをビルド：`yarn build --scope @markuplint/ml-ast`
2. 次に `ml-core` をビルド：`yarn build --scope @markuplint/ml-core`
3. `switch` の網羅性エラーを確認 -- TypeScript は `node.type` の `switch` で新しい型値のケースが欠けている場合に報告します
4. 共用体型の不一致を確認 -- 共用体に型を追加すると、既存の絞り込みコードの更新が必要になる場合があります

### ml-core の `createNode()` のケース漏れ

**症状：** 実行時に `TypeError: Invalid AST node types "newtype"` が発生する。

**原因：** 新しいノード型が `MLASTNodeType` と関連する共用体型に追加されたが、`ml-core` の `createNode()` の switch 文が更新されていない。

**修正：** `packages/@markuplint/ml-core/src/ml-dom/helper/create-node.ts` に新しい型の `case` を追加してください。

### パーサーが期待されるノードを生成しない

**症状：** パーサーが新しく追加されたフィールドや型のノードを生成しない。

**診断：**

1. パーサーの実装が新しいフィールドを設定するように更新されているか確認
2. オプションフィールドの場合、フィールドが暗黙的に `undefined` になっていないか検証
3. パーサーとこのパッケージの両方をビルドして型の整合性を確認
