# メンテナンスガイド

## コマンド

| コマンド                                       | 説明                   |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/smarty-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/smarty-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/smarty-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/smarty-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `index.spec.ts` | SmartyParser 統合テスト（スクリプトレット、コメント、リテラルブロック、ネストブロック、フル HTML） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{ title }</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:15](5,14)#ps:smarty-scriptlet: {␣title␣}',
  '[1:15]>[1:21](14,20)div: </div>',
]);
```

各タグタイプのノード名:

| ignoreTags タイプ  | AST ノード名           |
| ------------------ | ---------------------- |
| `smarty-literal`   | `#ps:smarty-literal`   |
| `smarty-comment`   | `#ps:smarty-comment`   |
| `smarty-scriptlet` | `#ps:smarty-scriptlet` |

## レシピ

### 1. ignoreTags パターンの追加・変更

1. `src/parser.ts` を読み、既存の `ignoreTags` 配列を確認
2. 新しいエントリを追加、または既存のものを変更:
   - `type`: `smarty-` プレフィックスを持つ説明的な名前
   - `start`: 開始デリミタ（文字列または正規表現）
   - `end`: 終了デリミタ（文字列）
3. 適切な順序を確保: より具体的なパターン（長い開始デリミタ）をより一般的なものの前に配置。例: `{literal}` を `{` の前に
4. ビルド: `yarn build --scope @markuplint/smarty-parser`
5. `src/index.spec.ts` にテストケースを追加
6. テスト: `yarn test --scope @markuplint/smarty-parser`

### 2. パース問題の修正

1. 問題を再現する最小限の Smarty テンプレートを作成
2. `src/index.spec.ts` に `nodeListToDebugMaps` を使用した失敗するテストケースを記述
3. よくある原因:
   - **順序の誤り** -- 汎用パターン（`{`）が具体的なパターン（`{literal}`）より先にマッチしている
   - **貪欲なマッチング** -- デリミタがテキストを過剰に消費している
   - **基底パーサーの問題** -- 問題は `@markuplint/html-parser` または `@markuplint/parser-utils` にあり、このパッケージではない
4. `src/parser.ts` で問題を修正
5. ビルドとテスト: `yarn build --scope @markuplint/smarty-parser && yarn test --scope @markuplint/smarty-parser`

### 3. テストケースの追加

1. `src/index.spec.ts` の既存パターンを確認
2. `nodeListToDebugMaps()` を使用してデバッグ出力を生成
3. ノード名が期待される `#ps:smarty-*` パターンと一致することを検証
4. テストすべき一般的な Smarty パターン:
   - 変数: `{$name}`、`{$user.name}`
   - モディファイア: `{$name|escape}`、`{$date|date_format:"%Y"}`
   - 関数: `{include file='header.tpl'}`、`{assign var='x' value='y'}`
   - ブロックタグ: `{if $cond}...{/if}`、`{foreach $items as $item}...{/foreach}`
   - コメント: `{* this is a comment *}`
   - リテラルブロック: `{literal}...{/literal}`

## 上流依存

このパッケージは `@markuplint/html-parser` のみに依存しています。`HtmlParser` の `ignoreTags` メカニズムや基底 `Parser` クラスの変更がこのパッケージに影響する可能性があります。

`@markuplint/html-parser` が更新された場合:

```shell
yarn build --scope @markuplint/smarty-parser && yarn test --scope @markuplint/smarty-parser
```

## トラブルシューティング

### Smarty 式が検出されない

**症状:** `{$variable}` のような Smarty タグが `#ps:smarty-scriptlet` ノードではなくプレーンテキストとして表示される。

**原因:** `ignoreTags` パターンがマッチしていない。開始または終了デリミタが不正な可能性がある。

**解決策:**

1. `src/parser.ts` の `ignoreTags` 配列を確認
2. 開始/終了デリミタが対象の Smarty 構文と一致することを検証
3. 問題を再現するテストケースを追加

### 誤ったタグタイプが割り当てられる

**症状:** `{* comment *}` が `#ps:smarty-comment` ではなく `#ps:smarty-scriptlet` として検出される。

**原因:** パターン順序の問題。汎用的な `{` パターンが、より具体的な `{*` パターンの前にマッチしている。

**解決策:**

1. `ignoreTags` 配列でより具体的なパターンが先に配置されていることを確認
2. 正しい順序: `smarty-literal` > `smarty-comment` > `smarty-scriptlet`

### リテラルブロックが正しく処理されない

**症状:** `{literal}...{/literal}` 内のコンテンツが Smarty 式としてパースされる。

**原因:** `smarty-literal` パターンがマッチしていない、または `smarty-scriptlet` の後に配置されている。

**解決策:**

1. `smarty-literal` が `ignoreTags` の最初のエントリであることを確認
2. start が正確に `{literal}` で end が正確に `{/literal}` であることを確認
