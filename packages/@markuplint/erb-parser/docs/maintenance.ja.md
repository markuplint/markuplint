# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/erb-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/erb-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/erb-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/erb-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                  |
| --------------- | ----------------------------------------------------------- |
| `index.spec.ts` | ERB タグパース、HTML/ERB 混在コンテンツ、エスケープデリミタ |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const parse = parser.parse.bind(parser);
const doc = parse('<div><%= name %></div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:18](5,17)#ps:erb-ruby-expression: <%=\u2420name\u2420%>',
  '[1:18]>[1:24](17,23)div: </div>',
]);
```

タグタイプが正しく認識されているかの検証:

```ts
expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-expression');
expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:erb-comment');
expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-code');
```

## レシピ

### 1. 新しい ignoreTags パターンの追加

1. `src/parser.ts` を読み、既存の `ignoreTags` 配列を確認
2. 新しいタグの `type` 名を決定（命名規則: `erb-<説明>`）
3. `start` と `end` パターンを定義:
   - 固定の開始シーケンスには文字列リテラルを使用（例: `'<%='`）
   - 先読み/後読みが必要なパターンには正規表現を使用（例: `/<%(?!%)/`）
4. 正しい位置にエントリを挿入:
   - より具体的なパターンを汎用パターンの前に配置
   - 例: `<%=` を `<%` の前に
5. `src/index.spec.ts` にテストケースを追加:
   - ノード名が `#ps:<type>` であることを検証
   - エスケープされたデリミタ（`<%%`）にマッチしないことを検証
6. ビルドとテスト:

```shell
yarn build --scope @markuplint/erb-parser && yarn test --scope @markuplint/erb-parser
```

### 2. 既存の ignoreTags パターンの変更

1. `src/parser.ts` を読み、変更するエントリを特定
2. `start`、`end`、または `type` を変更
3. 変更後もパターンの順序が正しいことを確認
4. ノード名が変更された場合は `src/index.spec.ts` のテストケースを更新
5. ビルドとテスト:

```shell
yarn build --scope @markuplint/erb-parser && yarn test --scope @markuplint/erb-parser
```

## 下流影響

このパッケージには下流のパーサー依存はありません。markuplint エンジンから直接使用されるリーフパーサーであるため、変更が他のパーサーパッケージに影響を与えることはありません。
