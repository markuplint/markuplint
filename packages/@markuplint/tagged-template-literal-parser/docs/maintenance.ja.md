# メンテナンスガイド

## コマンド

| コマンド                                                             | 説明                   |
| -------------------------------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/tagged-template-literal-parser`      | このパッケージをビルド |
| `yarn dev --scope @markuplint/tagged-template-literal-parser`        | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/tagged-template-literal-parser`      | ビルド成果物を削除     |
| `npx vitest run packages/@markuplint/tagged-template-literal-parser` | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル                   | カバレッジ                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| `index.spec.ts`                  | パーサー統合テスト（ノードリスト構造、式、属性等）           |
| `find-template-literals.spec.ts` | テンプレートリテラル抽出ユニットテスト（タグ検出、式の位置） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('const t = html`<div>${name}</div>`;');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:16]>[1:21](15,20)div: <div>',
  '[1:21]>[1:28](20,27)#ps:ttl-expression: ${name}',
  '[1:28]>[1:34](27,33)div: </div>',
]);
```

テンプレートリテラル抽出テストでは、タグ付きテンプレートが正しく検出され位置が正確であることを検証します:

```ts
import { findTemplateLiterals } from './find-template-literals.js';

const results = findTemplateLiterals('const t = html`<div></div>`;');
expect(results).toHaveLength(1);
expect(results[0].tagName).toBe('html');
expect(results[0].htmlContent).toBe('<div></div>');
```

## レシピ

### 1. デフォルトタグ名の追加

新しいタグ関数名をデフォルトでサポートする必要がある場合:

1. `src/parser.ts` を開く
2. コンストラクタのデフォルトパラメータを変更して新しいタグを含める:
   ```ts
   constructor(tagNames: readonly string[] = ['html', 'svg']) {
   ```
3. `src/find-template-literals.spec.ts` にテストを追加:
   ```ts
   test('finds svg tagged template by default', () => {
     const results = findTemplateLiterals('const t = svg`<circle />`;', ['svg']);
     expect(results).toHaveLength(1);
   });
   ```
4. `src/index.spec.ts` に統合テストを追加
5. ビルド: `yarn build --scope @markuplint/tagged-template-literal-parser`
6. テスト: `npx vitest run packages/@markuplint/tagged-template-literal-parser/src/`

### 2. 新しいタグ解決パターンの追加

新しいタグ式形式の認識が必要な場合（例: コール式）:

1. `src/find-template-literals.ts` を開く
2. `resolveTagName` 関数に新しいケースを追加:
   ```ts
   case AST_NODE_TYPES.CallExpression: {
     // html(options)`...` パターンを処理
     return resolveTagName(tag.callee);
   }
   ```
3. `src/find-template-literals.spec.ts` にテストを追加
4. `src/index.spec.ts` に統合テストを追加
5. 上記と同様にビルド・テスト

### 3. 式の処理の変更

`${...}` 式のマスクまたは復元方法を変更する場合:

1. `src/parser.ts` を開き、コンストラクタ内の `ignoreTags` 配列を見つける
2. `type`、`start`、`end` フィールドを必要に応じて変更
3. `src/index.spec.ts` 内の影響を受けるすべてのテストを更新:
   - `#ps:ttl-expression` を検索し、新しいタイプ名に更新
4. 上記と同様にビルド・テスト

## 下流への影響

このパッケージはリーフパーサーであり、他のパッケージはこれに依存していません。`@markuplint/tagged-template-literal-parser` への変更は、下流パッケージのテストを必要としません。
