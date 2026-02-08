# メンテナンスガイド

## コマンド

| コマンド                                     | 説明                   |
| -------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/html-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/html-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/html-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/html-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル                         | カバレッジ                                                       |
| -------------------------------------- | ---------------------------------------------------------------- |
| `index.spec.ts`                        | HtmlParser 統合テスト（HTML ドキュメントとフラグメントのパース） |
| `get-namespace.spec.ts`                | HTML、SVG、MathML 要素の名前空間解決                             |
| `optimize-starts-head-or-body.spec.ts` | head/body タグ最適化のセットアップと復元                         |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/html-parser';

const doc = parser.parse('<div class="foo">text</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

## レシピ

### 1. HtmlParser のオーバーライドメソッド変更

1. `src/parser.ts` を読み、変更するオーバーライドメソッドを特定
2. `@markuplint/parser-utils` の基底 `Parser` クラスを確認し、親の動作を理解
3. 変更を行い、必要な箇所で `super.*()` 呼び出しが保持されていることを確認:
   - `beforeParse()` — 最初に `super.beforeParse()` を呼び出す必要あり
   - `afterParse()` — 最初に `super.afterParse()` を呼び出す必要あり
   - `afterNodeize()` — 最初に `super.afterNodeize()` を呼び出す必要あり
   - `visitText()` — オプション付きで `super.visitText()` を呼び出す
4. ビルド: `yarn build --scope @markuplint/html-parser`
5. テスト実行: `yarn test --scope @markuplint/html-parser`
6. 下流への影響を確認（下記チェックリスト参照）

### 2. ゴースト要素処理の変更

1. `src/parser.ts` の `nodeize()` メソッドを読む — ゴースト要素のブランチは `if (!location)` ブロック
2. `afterNodeize()` メソッドを読み、`afterPosition` 状態がどのように維持されているかを理解
3. 位置計算または要素作成ロジックを変更
4. ビルドとテスト: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. ゴースト要素を発生させる HTML でテスト（例: `<div>text</div>` をドキュメントとしてパース — ゴーストの `<html>`、`<head>`、`<body>` が作成される）

### 3. 新しい名前空間の追加

1. `src/get-namespace.ts` を読む
2. `switch (parentNamespace)` ブロックに新しい名前空間 URI の `case` を追加
3. 新しい名前空間に適切なラッパー要素を選択
4. ビルドとテスト: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. `src/get-namespace.spec.ts` にテストケースを追加

### 4. Head/Body 最適化の変更

1. `src/optimize-starts-head-or-body.ts` を読む
2. このモジュールには3つの主要関数がある:
   - `isStartsHeadTagOrBodyTag()` — 検出用正規表現
   - `optimizeStartsHeadTagOrBodyTagSetup()` — プレースホルダー置換
   - `optimizeStartsHeadTagOrBodyTagResume()` — 名前の復元
3. 変更時の注意点:
   - プレースホルダー文字 `\uFFFD`（Unicode Replacement Character）はユニークである必要がある
   - `replaceAll` の正規表現は開始タグと閉じタグの両方にマッチする必要がある
   - 復元は `starttag` と `endtag` の両方のノードタイプを処理する必要がある
4. ビルドとテスト: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. `src/optimize-starts-head-or-body.spec.ts` にテストケースを追加または更新

## 下流影響チェックリスト

このパッケージへの変更は、下流の4つのパーサーパッケージに影響を与える可能性があります:

| パッケージ                  | 関係                      | 主な依存                                           |
| --------------------------- | ------------------------- | -------------------------------------------------- |
| `@markuplint/jsx-parser`    | `HtmlParser` を継承       | 全オーバーライドメソッド、コンストラクタオプション |
| `@markuplint/vue-parser`    | `HtmlParser` をインポート | `tokenize()`、`nodeize()`                          |
| `@markuplint/svelte-parser` | `HtmlParser` をインポート | `tokenize()`、`nodeize()`                          |
| `@markuplint/astro-parser`  | `HtmlParser` をインポート | `tokenize()`、`nodeize()`                          |

`HtmlParser` を変更する際は、必ず下流パーサーのテストも実行してください:

```shell
yarn test --scope @markuplint/html-parser --scope @markuplint/jsx-parser \
  --scope @markuplint/vue-parser --scope @markuplint/svelte-parser \
  --scope @markuplint/astro-parser
```

## トラブルシューティング

### ゴースト要素の位置がおかしい

**症状:** ゴースト要素（`<html>`、`<head>`、`<body>`）の行/列/オフセット値が AST 内で不正。

**原因:** `afterPosition` 状態が正しく更新されていないか、`nodeize()` 内の深さチェックが誤っている。

**解決策:**

1. `afterNodeize()` を確認 — `this.state.afterPosition` が正しい `endOffset`、`endLine`、`endCol`、`depth` で更新されていることを確認
2. `nodeize()` のゴースト要素ブランチを確認 — `depth === this.state.afterPosition.depth` の比較が正しいことを確認

### Head/body タグのパースで予期しない結果が出る

**症状:** ソースが `<head>` または `<body>` で始まる場合、パースされた AST にプレースホルダー名が残る、または要素が欠落する。

**原因:** 最適化のセットアップまたは復元ステップにバグがある。

**解決策:**

1. `isStartsHeadTagOrBodyTag()` を確認 — 検出用正規表現が入力にマッチすることを確認
2. `optimizeStartsHeadTagOrBodyTagSetup()` を確認 — プレースホルダー名が正しく生成されていることを検証
3. `optimizeStartsHeadTagOrBodyTagResume()` を確認 — 開始タグと終了タグの両方で元の名前が復元されていることを検証

### 名前空間解決が誤った値を返す

**症状:** SVG または MathML 要素に間違った名前空間 URI が割り当てられる。

**原因:** 親の名前空間コンテキストが正しく渡されていないか、parse5 が期待と異なる名前空間解決をしている。

**解決策:**

1. 呼び出し元のコードを確認 — `nodeize()` 内で `originNode.namespaceURI` が正しく読み取られていることを確認
2. `getNamespace()` を確認 — 特定のタグ名と親名前空間の組み合わせでテストケースを追加
3. parse5 がインテグレーションポイントルールを適用して名前空間を変更する場合があることに注意
