# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/php-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/php-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/php-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/php-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                       |
| --------------- | ---------------------------------------------------------------- |
| `index.spec.ts` | PHPParser 統合テスト（エコータグ、ショートタグ、EOF 未閉鎖タグ） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div><?= name ?></div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

### タグタイプのアサーション

各 PHP タグバリアントには `#ps:*` ノード名を検証する専用テストがあります:

```ts
expect(parse('<?php any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-tag');
expect(parse('<?= any ?>').nodeList[0]?.nodeName).toBe('#ps:php-echo');
expect(parse('<? any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
```

### EOF 未閉鎖タグのテスト

テストスイートでは、閉じ `?>` がない PHP タグが正しくキャプチャされることを検証しています:

```ts
expect(parse('<?php any;').nodeList[0]?.nodeName).toBe('#ps:php-tag');
expect(parse('<? any;').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
```

## レシピ

### 1. 新しい PHP タグバリアントの追加

1. `src/parser.ts` を開く
2. `ignoreTags` 配列に新しいエントリを追加:
   - `php-short-tag` の**前**に配置する（最も汎用的な `<?` パターンは最後に残す必要あり）
   - `start` にはデリミタが固定プレフィックスの場合は文字列を使用
   - `end` にはタグが EOF で未閉鎖のまま残る可能性がある場合は `/\?>|$/` を、常に閉じられる場合は `?>` を使用
3. `src/index.spec.ts` にテストケースを追加:
   - `Tags` テストで `#ps:*` ノード名を検証
   - `Node list` テストで周囲の HTML を含むデバッグマップ出力を検証
4. ビルド: `yarn build --scope @markuplint/php-parser`
5. テスト: `yarn test --scope @markuplint/php-parser`

### 2. 既存タグパターンの変更

1. `src/parser.ts` を開く
2. `ignoreTags` 配列内の対象エントリを見つけ、`type`、`start`、または `end` を更新
3. `src/index.spec.ts` の影響を受けるテストケースを更新:
   - `Tags` テスト（nodeName アサーション）と `Node list` テスト（デバッグマップスナップショット）の両方を確認
4. ビルド: `yarn build --scope @markuplint/php-parser`
5. テスト: `yarn test --scope @markuplint/php-parser`

### 3. 上流 HtmlParser 依存の更新

1. `package.json` の `@markuplint/html-parser` 依存を更新
2. ビルド: `yarn build --scope @markuplint/php-parser`
3. テスト: `yarn test --scope @markuplint/php-parser`
4. テストが失敗した場合は `HtmlParser` の変更履歴で `ignoreTags` メカニズムの破壊的変更を確認

## トラブルシューティング

### PHP タグが認識されない

**症状:** PHP タグが `#ps:*` ノードではなく、AST 内で生テキストとして表示される。

**原因:** `start` デリミタが入力とマッチしない、またはより具体的なパターンが先にマッチした。

**解決策:**

1. `ignoreTags` の順序を確認 — より具体的なパターン（例: `<?php`）は、より汎用的なパターン（例: `<?`）の前に配置する必要あり
2. `start` 文字列が入力内の正確な文字とマッチすることを確認

### 未閉鎖の PHP タグがファイルの残り全体を消費する

**症状:** `?>` で閉じられるべき PHP タグが、代わりにファイルの末尾まで拡張される。

**原因:** `end` パターンが `/\?>|$/` を使用しており、`?>` が正しくマッチされていない。

**解決策:**

1. `?>` が PHP の文字列リテラルやコメント内にないことを確認（このパーサーは PHP 構文を解析しない — デリミタのマッチングのみ行う）
2. `end` 正規表現が正しいことを確認: `/\?>|$/`（`\?` はエスケープが必要）
