# メンテナンスガイド

## コマンド

| コマンド                                         | 説明                   |
| ------------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/mustache-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/mustache-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/mustache-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/mustache-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                 |
| --------------- | ---------------------------------------------------------- |
| `index.spec.ts` | タグ認識、ノードリスト構造、ブロックヘルパー、ベアテキスト |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{{ name }}</div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:15](5,14)#ps:mustache-tag: {{␣name␣}}',
  '[1:15]>[1:21](14,20)div: </div>',
]);
```

個別のタグタイプのアサーション:

```ts
expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-tag');
expect(parse('{{{ any }}}').nodeList[0]?.nodeName).toBe('#ps:mustache-unescaped');
expect(parse('{{! any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-comment');
```

## レシピ

### 1. ignoreTags エントリの追加・変更

1. `src/parser.ts` を読み、`MustacheParser` コンストラクタの `ignoreTags` 配列を確認
2. エントリを追加または変更し、正しい順序を維持:
   - より具体的な開始デリミタは、より一般的なものの前に配置する必要がある
   - 現在の順序: `{{!` -> `{{{` -> `{{`
3. 各エントリには `type`（文字列識別子）、`start`（開始デリミタ）、`end`（終了デリミタ）が必要
4. ビルド: `yarn build --scope @markuplint/mustache-parser`
5. `src/index.spec.ts` にテストケースを追加し、新しいタグタイプが正しい `#ps:*` ノード名を生成することを検証
6. テスト: `yarn test --scope @markuplint/mustache-parser`

### 2. パース問題の修正

1. 最小限の再現テンプレートを作成し、`src/index.spec.ts` に失敗するテストを記述
2. 問題の所在を特定:
   - **ignoreTags 設定**（このパッケージ）-- デリミタのマッチング、順序
   - **基底 HTML パーサー**（`@markuplint/html-parser`）-- HTML 構造処理
3. 適切なパッケージで修正を適用
4. ビルドとテスト: `yarn build --scope @markuplint/mustache-parser && yarn test --scope @markuplint/mustache-parser`
5. 修正が `@markuplint/html-parser` にある場合: `yarn test --scope @markuplint/html-parser` も実行

### 3. テストケースの追加

1. `src/index.spec.ts` を読み、既存のテスト構造を理解
2. ノードリストテストには `nodeListToDebugMaps` パターンを使用:
   ```ts
   const doc = parse('テンプレート文字列');
   expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([...]);
   ```
3. タグタイプテストには `nodeName` でアサート:
   ```ts
   expect(parse('{{ expr }}').nodeList[0]?.nodeName).toBe('#ps:mustache-tag');
   ```
4. テスト: `yarn test --scope @markuplint/mustache-parser`

## 上流の影響

このパッケージは `@markuplint/html-parser` に依存しています。`HtmlParser` の変更（特に `ignoreTags` 処理、`visitText`、`researchTags` メカニズム）はこのパーサーに影響を与える可能性があります。

`@markuplint/html-parser` が更新された場合は、以下を実行してください:

```shell
yarn test --scope @markuplint/mustache-parser
```

## トラブルシューティング

### Mustache タグが認識されない

**症状:** `{{ name }}` のような Mustache 式が `#ps:mustache-tag` ノードではなく生テキストとして表示される。

**原因:** `ignoreTags` エントリが欠落しているか、start/end デリミタが不正。

**解決策:**

1. `src/parser.ts` を確認 -- `ignoreTags` 配列に `start: '{{'` と `end: '}}'` のエントリが含まれていることを検証
2. エントリの順序を確認 -- より具体的なパターンが先に配置されている必要がある

### トリプルスタッシュがダブルスタッシュとしてパースされる

**症状:** `{{{ raw }}}` が `#ps:mustache-unescaped` ではなく `#ps:mustache-tag` ノードを生成する。

**原因:** `mustache-unescaped` エントリ（`{{{` / `}}}`）が `mustache-tag` エントリ（`{{` / `}}`）の後に配置されているため、より一般的なパターンが先にマッチする。

**解決策:**

1. `ignoreTags` 配列内で `mustache-unescaped` エントリを `mustache-tag` エントリの前に移動

### コメントタグが通常のタグとしてパースされる

**症状:** `{{! comment }}` が `#ps:mustache-comment` ではなく `#ps:mustache-tag` ノードを生成する。

**原因:** `mustache-comment` エントリ（`{{!` / `}}`）が `mustache-tag` エントリ（`{{` / `}}`）の後に配置されている。

**解決策:**

1. `ignoreTags` 配列内で `mustache-comment` エントリが `mustache-tag` エントリの前にリストされていることを確認
