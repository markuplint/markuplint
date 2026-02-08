# メンテナンスガイド

`@markuplint/selector` の実践的な運用・メンテナンスガイド。

## コマンド

| コマンド                                        | 説明                              |
| ----------------------------------------------- | --------------------------------- |
| `yarn build --scope @markuplint/selector`       | TypeScript を `lib/` にコンパイル |
| `yarn workspace @markuplint/selector run dev`   | ウォッチモードでコンパイル        |
| `yarn workspace @markuplint/selector run clean` | コンパイル出力をクリーン          |
| `yarn test --scope @markuplint/selector`        | テストを実行                      |

## テスト

テストは `vitest` と `jsdom`（DOM 環境）を使用します。4 つのテストファイルがパッケージをカバーしています:

| テストファイル                   | カバー範囲                                                               |
| -------------------------------- | ------------------------------------------------------------------------ |
| `selector.spec.ts`               | コア `Selector` クラス、CSS セレクタマッチング、コンビネータ、擬似クラス |
| `create-selector.spec.ts`        | `createSelector()` ファクトリ、キャッシュ、拡張擬似クラス統合            |
| `match-selector.spec.ts`         | `matchSelector()` 統合関数、CSS と Regex セレクタのディスパッチ          |
| `regex-selector-matches.spec.ts` | `regexSelectorMatches()` パターンマッチング、キャプチャグループ          |

### テストの実行

```bash
# 全セレクタテストを実行
yarn test --scope @markuplint/selector

# 特定のテストファイルを実行
yarn workspace @markuplint/selector run vitest run src/selector.spec.ts
```

## レシピ

### 1. 新しい拡張擬似クラスの追加

新しい markuplint 固有の擬似クラス（例: `:custom()`）を追加するには:

1. `src/extended-selector/custom-pseudo-class.ts` を作成:

   ```typescript
   import type { SelectorResult } from '../types.js';

   export function customPseudoClass() {
     return (content: string) =>
       (el: Element): SelectorResult => {
         // content 文字列をパースして el に対してマッチング
         const matched = /* マッチングロジック */;
         return {
           specificity: [0, 1, 0],
           matched,
           ...(matched ? { nodes: [el], has: [] } : {}),
         };
       };
   }
   ```

2. `src/create-selector.ts` で登録:

   ```typescript
   import { customPseudoClass } from './extended-selector/custom-pseudo-class.js';

   // createSelector() 内の extended オブジェクトに追加:
   instance = new Selector(
     selector,
     specs
       ? {
           model: contentModelPseudoClass(specs),
           aria: ariaPseudoClass(),
           role: ariaRolePseudoClass(specs),
           custom: customPseudoClass(), // ここに追加
         }
       : undefined,
   );
   ```

3. `src/create-selector.spec.ts` または新規テストファイルにテストを追加
4. `README.md` に新しい擬似クラスのドキュメントを追加
5. ビルド: `yarn build --scope @markuplint/selector`

### 2. 新しい CSS セレクタタイプのサポート追加

現在サポートされていない擬似クラス（例: `:empty`）をサポートするには:

1. `src/selector.ts` を開く
2. `pseudoMatch()` 関数の switch 文を見つける
3. 擬似クラスを「非サポート」ケースリストから新しいケースに移動して実装:
   ```typescript
   case ':empty': {
     const hasChildren = el.childNodes.length === 0;
     return {
       specificity: [0, 1, 0],
       matched: hasChildren,
       ...(hasChildren ? { nodes: [el], has: [] } : {}),
     };
   }
   ```
4. 新しいセレクタのテストを追加
5. `README.md` のサポート表を更新（`❌` を `✅` に変更）
6. ビルド: `yarn build --scope @markuplint/selector`

### 3. postcss-selector-parser メジャー更新時の対応

`postcss-selector-parser` がメジャーバージョンをリリースした場合:

1. 以下の破壊的変更をチェンジログで確認:
   - AST ノード型（`parser.Selector`、`parser.Node` 等）
   - パーサ API（`parser()`、`.processSync()`）
   - ノードプロパティの名前と型
2. `src/selector.ts` の主要な統合ポイント:
   - `Ruleset.parse()` -- `parser()` と `processSync()` を使用
   - `StructuredSelector` コンストラクタ -- `parser.Node` 型を走査
   - `SelectorTarget` -- ノードプロパティ（`value`、`attribute`、`operator`、`raws` 等）にアクセス
3. `package.json` の依存バージョンを更新
4. 型エラーや API 変更を修正
5. テストスイート全体を実行して互換性を確認
6. ビルド: `yarn build --scope @markuplint/selector`

### 4. 詳細度計算の修正

詳細度が正しく計算されない場合:

1. `src/compare-specificity.ts` の比較ロジックを確認
2. `src/selector.ts` の `SelectorTarget` と `pseudoMatch()` での詳細度割り当てを確認
3. Regex セレクタの場合、`src/match-selector.ts` の `uncombinedRegexSelect()` での詳細度追跡を確認
4. 主要な詳細度の値:
   - ID: `[1, 0, 0]`
   - クラス、属性、擬似クラス: `[0, 1, 0]`
   - タイプ（タグ）: `[0, 0, 1]`
   - ユニバーサル: `[0, 0, 0]`
   - `:where()`: 常に `[0, 0, 0]`
5. 誤った計算を再現するテストケースを追加
6. 修正して確認

### 5. 新しい Regex コンビネータの追加

Regex セレクタに新しいコンビネータを追加するには:

1. `src/types.ts` の `RegexSelectorCombinator` 型を更新:
   ```typescript
   export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)' | ':new()';
   ```
2. `src/match-selector.ts` の `SelectorTarget.match()` の switch にトラバーサルロジックを追加:
   ```typescript
   case ':new()': {
     // DOM トラバーサルロジックを実装
   }
   ```
3. 新しいコンビネータのテストを追加
4. ドキュメントを更新
5. ビルド: `yarn build --scope @markuplint/selector`

## トラブルシューティング

### セレクタパースエラー

**症状:** 有効に見えるセレクタで `InvalidSelectorError` がスローされる。

**診断:**

1. `postcss-selector-parser` がそのセレクタ構文をサポートしているか確認
2. セレクタを分離してテスト:
   ```typescript
   import parser from 'postcss-selector-parser';
   parser().processSync('your-selector');
   ```
3. 一部のセレクタには特定の `postcss-selector-parser` バージョンが必要な場合がある

### マッチングの不一致

**症状:** セレクタがマッチすべき時にマッチしない、またはその逆。

**診断:**

1. デバッグログを有効化: `DEBUG=selector* yarn test --scope @markuplint/selector`
2. `SelectorTarget` のマッチング順序を確認 -- コンポーネントは順次チェックされ、最初の不一致で失敗
3. HTML/SVG 要素の名前空間解決を `resolveNamespace()` で確認
4. 拡張擬似クラスの場合、`specs` が `createSelector()` に渡されているか確認

### 詳細度計算の問題

**症状:** 詳細度の高いルールが優先されない。

**診断:**

1. `matchSelector()` または `Selector.match()` が返す詳細度の値をログ出力
2. `compareSpecificity()` の比較ロジックを確認
3. `:where()` が正しく `[0, 0, 0]` を返しているか確認
4. ネストされた擬似クラス（`:not(:is(.a, .b))`）の場合、再帰的な詳細度計算をトレース

## 依存関係メモ

### postcss-selector-parser

- `selector.ts` 全体で使用される CSS セレクタ AST を提供
- 主要な型: `parser.Selector`、`parser.Node`、`parser.Pseudo`、`parser.Attribute`、`parser.ClassName`、`parser.Identifier`、`parser.Tag`、`parser.Universal`、`parser.Combinator`
- メジャーバージョンの破壊的変更は AST ノード構造に影響する可能性あり

### @markuplint/ml-spec

- `getComputedRole()`、`getAccname()`、`contentModelCategoryToTagNames()`、`resolveNamespace()` を提供
- `MLMLSpec` の型変更は拡張擬似クラスの実装に影響する可能性あり

### jsdom（開発）

- テストで DOM 環境を作成するための `JSDOM` を提供
- `jsdom` で作成された要素はセレクタマッチングロジックが使用する標準 DOM API を持つ
