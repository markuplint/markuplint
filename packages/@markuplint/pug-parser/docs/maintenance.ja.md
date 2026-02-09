# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/pug-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/pug-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/pug-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/pug-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従います:

| テストファイル                                   | カバレッジ                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `src/index.spec.ts`                              | PugParser 統合テスト（Pug テンプレートのエンドツーエンドパース） |
| `src/pug-parser/index.spec.ts`                   | AST 最適化テスト（pugParse、optimizeAST）                        |
| `src/utils/get-offset-from-line-and-col.spec.ts` | オフセット計算ユーティリティのテスト                             |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/pug-parser';

const doc = parser.parse('div.foo#bar text content');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

## レシピ

### 1. 新しい Pug AST ノードタイプの追加

1. `src/types.ts` を読み、新しい最適化済み型を追加:
   ```ts
   export type ASTNewType = PugAST.NewType & AdditionalASTData;
   ```
2. 新しい型を `ASTNode` 共用体に追加
3. `src/pug-parser/index.ts` を読み、`optimizeAST()` に新しい `case` を追加:
   ```ts
   case 'NewType': {
     const block = optimizeAST(node.block, tokens, pug);
     const newNode: ASTNewType = {
       type: node.type,
       raw,
       offset,
       endOffset,
       line,
       endLine,
       column,
       endColumn,
       block,
       filename: node.filename ?? null,
     };
     nodes.push(newNode);
     continue;
   }
   ```
4. `src/parser.ts` を読み、`nodeize()` に新しい `case` を追加:
   - HTML 的な要素の場合: `getNamespace()` と属性で `visitElement()` を使用
   - Pug 固有の構文の場合: 子ノードで `visitPsBlock()` を使用
5. ビルド: `yarn build --scope @markuplint/pug-parser`
6. テスト: `yarn test --scope @markuplint/pug-parser`

### 2. 属性処理の変更

1. `src/parser.ts` を読む — `visitAttr()` メソッドには3つのパスがある:
   - **ショートハンド**（`#` / `.`）: `AttrState.BeforeValue` を使用し、`potentialName` を設定
   - **通常**: `noQuoteValueType: 'script'` を使用
   - **値パース**: `scriptParser()` で型検出（Numeric、Boolean、String、Template、dynamic）
2. 変更を行う:
   - 新しいショートハンド構文の場合: 既存の `#`/`.` チェックの前に条件を追加
   - 属性名変換の場合: `attr.name.raw.endsWith('!')` チェックの後に追加
   - 値型検出の場合: `scriptParser()` 結果の switch を変更
3. `this.updateAttr()` でメタデータを設定: `potentialName`、`potentialValue`、`isDuplicatable`、`valueType`
4. ビルドとテスト: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 3. AST 最適化の更新

1. `src/pug-parser/index.ts` を読む — 最適化パイプライン:
   - `pugParse()` — エントリーポイント: lex → parse → optimize
   - `optimizeAST()` — 再帰的なノード強化
   - `getOffsetsFromLines()` — 累積オフセットルックアップテーブル
   - `getLocationFromToken()` — 行/列によるトークンマッチング
   - `getAttrs()` — レキサートークンからの属性強化
   - `getEndAttributeLocation()` — 属性を含むタグの終了位置
   - `mergeTextNode()` — 連続テキストノードのマージ
   - `getPipelessText()` — パイプレステキストブロックの検出
   - `getRawTextAndLocationEnd()` — 複数行テキストの処理
   - `optimizeASTOfConditionalNode()` — else-if/else チェーンの処理
2. 変更時の注意点:
   - オフセットは `getOffsetsFromLines()` から `offsets[line - 2]` を使用して計算する必要がある
   - 終了位置は `getLocationFromToken()` でマッチするレキサートークンから取得
   - `raw` は元のソースからスライスする必要がある: `pug.slice(offset, endOffset)`
   - `structuredClone()` によるトークンのクローンが必要 — パーサーはトークン配列を変更する
3. ビルドとテスト: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 4. インライン HTML 処理の変更

1. `src/parser.ts` を読む — `nodeize()` の `Text` ケース:
   - `<` や `#[` を含むテキストは `HtmlInPugParser` でパースされる
   - `#ps:tag-interpolation` ノードは `PugParser` で再帰的にパースされる
2. タグ補間構文を変更するには:
   - `HtmlInPugParser` コンストラクタの `ignoreTags` を変更
   - `Text` ケースの `#ps:tag-interpolation` 検出を更新
   - `#[` プレフィックスと `]` サフィックスの除去のオフセット計算を更新
3. インライン HTML の動作を変更するには:
   - `HtmlInPugParser` クラスを変更（`HtmlParser` を拡張）
   - `offsetOffset`、`offsetLine`、`offsetColumn` コンテキストが正しく渡される必要がある
4. ビルドとテスト: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 5. useOffset インデントフィルタリングの変更

1. `src/pug-parser/index.ts` を読む — `pugParse()` 関数
2. `useOffset` フラグは、ゼロ以外のオフセットでサブテンプレートをパースする際に `indent` と `outdent` トークンをフィルタリングする
3. 変更するには:
   - `if (useOffset)` ブロック内のフィルタ条件を変更
   - サブテンプレートコンテキストで他のトークンタイプもフィルタリングが必要かを検討
4. ビルドとテスト: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

## トラブルシューティング

### Pug AST ノードのオフセットがおかしい

**症状:** Pug ノードの `offset`、`endOffset`、`endLine`、`endColumn` が markuplint AST 内で不正。

**原因:** `optimizeAST()` 関数がオフセットを誤って計算しているか、マッチするレキサートークンが不正。

**解決策:**

1. `getOffsetsFromLines()` を確認 — 入力に対して累積オフセットテーブルが正しいことを検証
2. `getLocationFromToken()` を確認 — 行/列で正しいトークンがマッチし、`tokenType` フィルタリングが正しいことを確認
3. 属性付きタグの場合、`getEndAttributeLocation()` を確認 — 正しいトークンで停止していることを検証
4. デバッグログを追加: 関連する `optimizeAST()` ケースで `console.log(JSON.stringify(node, null, 2))`

### タグ補間がパースされない

**症状:** `#[tag content]` が markuplint ノードに展開されず、生テキストとして表示される。

**原因:** テキストノードが `HtmlInPugParser` パスに到達していないか、`#ps:tag-interpolation` の検出が失敗している。

**解決策:**

1. `nodeize()` の `Text` ケースを確認 — `originNode.raw.includes('#[')` が `true` と評価されることを確認
2. `HtmlInPugParser` を確認 — `ignoreTags` が `#[...]` を正しくマスクしていることを検証
3. `#ps:tag-interpolation` の検出を確認 — `node.nodeName === '#ps:tag-interpolation'` であることを確認
4. 再帰的な `PugParser` 呼び出しを確認 — オフセットコンテキスト（`offsetOffset`、`offsetLine`、`offsetColumn`）が正しく計算されていることを検証

### 複雑な式の属性パースが失敗する

**症状:** 複雑な JavaScript 値を持つ Pug 属性（例: `data-value=obj.prop + 1`）がパースエラーまたは不正な AST を引き起こす。

**原因:** 複数トークンの式に対して `scriptParser()` の結果が正しく処理されていない。

**解決策:**

1. `visitAttr()` メソッドを確認 — 最後の `return` ブロックが複数トークンの式を `isDynamicValue: true, valueType: 'code'` として処理している
2. `@markuplint/parser-utils` の `scriptParser()` を確認 — 値の式が正しくトークン化されていることを検証
3. 単一トークンの式の場合、`switch (token.type)` がトークンタイプを正しく処理しているか検証

### ショートハンド属性の potentialName がおかしい

**症状:** `#my-id` や `.my-class` が間違った `potentialName` を持つ属性を生成する。

**原因:** ショートハンド検出または `endOffset` の再計算が誤っている。

**解決策:**

1. `visitAttr()` の `#`/`.` ブランチを確認 — `potentialName` が `#` の場合 `'id'`、`.` の場合 `'class'` に設定されていることを確認
2. `nodeize()` の Tag ケースで `endOffset` の再計算を確認 — ショートハンド属性では `attr.offset === attr.endOffset` が true であり、`endOffset` は `attr.offset + attr.val.length - 1` であるべき
3. Pug AST の `val` 値を検証 — `#my-id` の場合、`val` は `"'my-id'"`（前後にクォート付き）であるべき

### パイプレステキストが検出されない

**症状:** `.` 付きタグの後のインデントされたテキストがパイプレステキストとして扱われない。

**原因:** `getPipelessText()` 関数が `start-pipeless-text` / `end-pipeless-text` トークンを見つけられないか、行範囲チェックが失敗している。

**解決策:**

1. レキサー出力を確認 — `start-pipeless-text` と `end-pipeless-text` トークンが存在することを検証
2. 行範囲を確認: `startPipelessText.loc.start.line < node.line && node.line < endPipelessText.loc.start.line`
3. トークンが存在するが範囲が誤っている場合、pug-lexer バージョンの問題の可能性がある
