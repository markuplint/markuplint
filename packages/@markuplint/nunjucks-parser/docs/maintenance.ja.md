# メンテナンスガイド

## コマンド

| コマンド                                         | 説明                   |
| ------------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/nunjucks-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/nunjucks-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/nunjucks-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/nunjucks-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| `index.spec.ts` | パーサー統合テスト（block、output、comment タグの認識とネストされた HTML の処理） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{% if foo %}<span>{{ bar }}</span>{% endif %}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

シンプルなタグ認識テストの場合:

```ts
expect(parser.parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-block');
expect(parser.parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-output');
expect(parser.parse('{# any #}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-comment');
```

## レシピ

### 1. ignoreTags パターンの追加・変更

1. `src/parser.ts` を読み、`ignoreTags` 配列を確認
2. `type`、`start`、`end` プロパティを持つエントリを追加または変更
3. パターンが共通のプレフィックスを持つ場合、より具体的なパターンを先に配置
4. ビルド: `yarn build --scope @markuplint/nunjucks-parser`
5. `src/index.spec.ts` にテストケースを追加し、新しいパターンが期待される `#ps:*` ノードを生成することを検証
6. テスト: `yarn test --scope @markuplint/nunjucks-parser`

### 2. パース問題の修正

1. `src/index.spec.ts` に問題を再現する失敗するテストケースを追加
2. 問題が ignoreTags 設定（`src/parser.ts`）にあるか、上流の `@markuplint/html-parser` にあるかを判断
3. 上流の場合、そちらで修正し両パッケージをテスト:
   ```shell
   yarn test --scope @markuplint/html-parser --scope @markuplint/nunjucks-parser
   ```
4. ローカルの場合、ignoreTags パターンを調整
5. ビルドとテスト: `yarn build --scope @markuplint/nunjucks-parser && yarn test --scope @markuplint/nunjucks-parser`

### 3. テストケースの追加

1. `src/index.spec.ts` の既存パターンを確認
2. タグ認識テスト: `nodeName` が `#ps:nunjucks-block`、`#ps:nunjucks-output`、`#ps:nunjucks-comment` であることをアサート
3. 複雑な HTML: `nodeListToDebugMaps` を使用した完全な AST スナップショット比較
4. 実行: `yarn test --scope @markuplint/nunjucks-parser`

## 上流への影響

このパッケージは `@markuplint/html-parser` のみに依存しています。`HtmlParser` クラスまたはその `ignoreTags` メカニズムへの変更がこのパーサーに影響する可能性があります。上流の依存関係をアップグレードする際:

1. ビルド: `yarn build --scope @markuplint/nunjucks-parser`
2. テスト: `yarn test --scope @markuplint/nunjucks-parser`
3. 3つの式タイプ（block、output、comment）がすべて正しくパースされることを検証

## トラブルシューティング

### Nunjucks 式がプリプロセッサブロックとして認識されない

**症状:** Nunjucks 式（例: `{% raw %}`）が `#ps:nunjucks-block` ノードではなくテキストコンテンツとして表示される。

**原因:** ignoreTags パターンがその式のデリミタにマッチしていない。

**解決策:**

1. `src/parser.ts` を確認 -- ignoreTags エントリの `start` と `end` デリミタを検証
2. 式がバリアントデリミタを使用している場合、新しい ignoreTags エントリを追加するか既存のパターンを調整
3. 失敗した特定の式でテスト

### HTML 属性内の Nunjucks 式がパースエラーを引き起こす

**症状:** 属性値に Nunjucks 式を含む HTML（例: `class="{{ foo }}"`）が予期しない AST 出力を生成する。

**原因:** ignoreTags のマスクはソース位置を保持するが、プレースホルダーが HTML 属性パースと相互作用する可能性がある。

**解決策:**

1. `nodeListToDebugMaps` を使用した最小限のテストケースで再現
2. これは通常、上流の `HtmlParser` の問題 -- 他のテンプレートパーサーでも同じ問題があるか確認
3. Nunjucks デリミタに固有の問題であれば、`@markuplint/html-parser` に対してイシューを作成
