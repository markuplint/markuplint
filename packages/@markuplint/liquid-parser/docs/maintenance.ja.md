# メンテナンスガイド

## コマンド

| コマンド                                       | 説明                   |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/liquid-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/liquid-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/liquid-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/liquid-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                       |
| --------------- | ---------------------------------------------------------------- |
| `index.spec.ts` | 各 ignoreTags エントリが正しい `#ps:` ノードを生成することを検証 |

主なテストパターンでは、テンプレート文字列をパースし、結果のノード名を確認します:

```ts
import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:liquid-block');
expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:liquid-output');
```

## レシピ

### 1. 新しい ignoreTags エントリの追加

Liquid が新しい構文を導入し、不透明ブロックとして扱う必要がある場合にこのレシピを使用します。

1. `src/parser.ts` を開く
2. `LiquidParser` コンストラクタの `ignoreTags` 配列に新しいオブジェクトを追加:
   ```ts
   {
     type: 'liquid-<name>',
     start: '<開始デリミタ>',
     end: '<終了デリミタ>',
   },
   ```
3. `src/index.spec.ts` を開き、テストを追加:
   ```ts
   test('liquid-<name>', () => {
     expect(parse('<開始デリミタ> any <終了デリミタ>').nodeList[0]?.nodeName).toBe('#ps:liquid-<name>');
   });
   ```
4. ビルドとテスト:
   ```shell
   yarn build --scope @markuplint/liquid-parser && yarn test --scope @markuplint/liquid-parser
   ```

### 2. 既存の ignoreTags エントリの変更

デリミタの変更や ignoreTags タイプのリネームを行う場合にこのレシピを使用します。

1. `src/parser.ts` を開き、`ignoreTags` 配列内の変更対象エントリを特定
2. `type`、`start`、または `end` フィールドを必要に応じて更新
3. `src/index.spec.ts` の対応するテストを新しい値に合わせて更新
4. ビルドとテスト:
   ```shell
   yarn build --scope @markuplint/liquid-parser && yarn test --scope @markuplint/liquid-parser
   ```

**注意:** `type` 名を変更すると AST 内の `#ps:` ノード名が変わります。特定のノード名にマッチしている下流の利用者は更新が必要です。

## 上流依存

このパッケージのパース動作は `@markuplint/html-parser` に完全に依存しています。`HtmlParser` の `ignoreTags` メカニズムが変更された場合、このパーサーに影響が及ぶ可能性があります。

上流パッケージと合わせてテストするには:

```shell
yarn build --scope @markuplint/html-parser --scope @markuplint/liquid-parser
yarn test --scope @markuplint/liquid-parser
```

## トラブルシューティング

### Liquid 式が不透明ブロックではなく HTML としてパースされる

**症状:** `{% if condition %}` のような Liquid タグが HTML パースエラーを発生させるか、`#ps:liquid-block` ノードとして認識されない。

**原因:** `ignoreTags` エントリの `start` または `end` デリミタがソース内の構文と一致していない。

**解決策:**

1. `src/parser.ts` を確認 — `start` と `end` の文字列が Liquid のデリミタと正確に一致していることを検証
2. デリミタ文字列に空白の問題がないことを確認
3. テストスイートを実行して確認: `yarn test --scope @markuplint/liquid-parser`

### 新しい ignoreTags エントリが認識されない

**症状:** 新しいエントリを追加した後も、パーサーがその構文を HTML として扱う。

**原因:** ビルド出力が古い。

**解決策:**

1. 再ビルド: `yarn build --scope @markuplint/liquid-parser`
2. `lib/parser.js` にエントリが含まれていることを確認
3. テスト実行: `yarn test --scope @markuplint/liquid-parser`
