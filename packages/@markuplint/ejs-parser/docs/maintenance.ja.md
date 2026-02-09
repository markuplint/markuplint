# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/ejs-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/ejs-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/ejs-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/ejs-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                 |
| --------------- | ---------------------------------------------------------- |
| `index.spec.ts` | EJSParser 統合テスト（ノードリスト構造、タグタイプ検出等） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div><%= value %></div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:18](5,17)#ps:ejs-output-value: <%=␣value␣%>',
  '[1:18]>[1:24](17,23)div: </div>',
]);
```

タグタイプ検出テストでは、各 EJS バリアントが正しい `#ps:*` ノード名を生成することを検証します:

```ts
expect(parse('<%_ any _%>').nodeList[0].nodeName).toBe('#ps:ejs-whitespace-slurping');
expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:ejs-output-value');
expect(parse('<%- any -%>').nodeList[0].nodeName).toBe('#ps:ejs-output-unescaped');
expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:ejs-comment');
expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:ejs-scriptlet');
```

## レシピ

### 1. ignoreTags パターンの追加

新しい EJS タグバリアントのサポートが必要な場合:

1. `src/parser.ts` を開く
2. コンストラクタの `ignoreTags` 配列に新しいエントリを追加:
   ```ts
   {
     type: 'ejs-new-variant',
     start: '<%X',
     end: '%>',
   },
   ```
3. **順序が重要** — 新しいエントリは `ejs-scriptlet` の前に配置すること。`ejs-scriptlet` パターンはキャッチオール正規表現（`/<%(?!%)/`）を使用しており、より具体的なパターンとのマッチを避けるため最後に配置する必要がある
4. `src/index.spec.ts` にタグ検出テストを追加:
   ```ts
   test('ejs-new-variant', () => {
     expect(parse('<%X any %>').nodeList[0].nodeName).toBe('#ps:ejs-new-variant');
   });
   ```
5. 新しいバリアントに特別なパース動作がある場合、ノードリスト統合テストも追加
6. ビルド: `yarn build --scope @markuplint/ejs-parser`
7. テスト: `yarn test --scope @markuplint/ejs-parser`

### 2. ignoreTags パターンの変更

開始/終了デリミタの変更やタイプ名の変更:

1. `src/parser.ts` を開き、`ignoreTags` 内の対象エントリを見つける
2. `type`、`start`、`end` フィールドを必要に応じて変更
3. `src/index.spec.ts` 内の影響を受けるすべてのテストを更新:
   - **タグタイプテスト**（`Tags` describe ブロック）— `nodeName` アサーションを更新
   - **ノードリストテスト**（`Node list` describe ブロック）— デバッグマップスナップショット内の `#ps:*` エントリを更新
4. ビルド: `yarn build --scope @markuplint/ejs-parser`
5. テスト: `yarn test --scope @markuplint/ejs-parser`

## 下流への影響

このパッケージはリーフパーサーであり、他のパッケージはこれに依存していません。`@markuplint/ejs-parser` への変更は、下流パッケージのテストを必要としません。
