# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/vue-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/vue-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/vue-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/vue-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| `index.spec.ts` | VueParser 統合テスト（パース、ディレクティブ、名前空間、要素タイプ、コメント） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/vue-parser';

const doc = parser.parse('<template><div class="foo">text</div></template>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

属性メタデータのテスト（ディレクティブ、potentialName、isDynamicValue）:

```ts
const doc = parser.parse('<template><div v-bind:title="val"></div></template>');
expect(doc.nodeList[0].attributes[0].potentialName).toBe('title');
expect(doc.nodeList[0].attributes[0].isDynamicValue).toBeTruthy();
```

要素タイプのテスト:

```ts
const doc = parser.parse('<template><MyComponent/></template>');
expect(doc.nodeList[0].elementType).toBe('authored');
```

## レシピ

### 1. Vue ディレクティブの追加・変更

1. `src/parser.ts` を読み、`visitAttr()` メソッドを見つける
2. 優先チェーン内の正しい位置を特定:
   - `v-on` / `@`（イベントバインディング） — 最初
   - `v-bind` / `:`（プロパティバインディング） — 2番目
   - `v-model` — 3番目
   - `v-slot` / `#` — 4番目
   - 汎用 `v-*` — 最後（キャッチオール）
3. 正規表現パターンを持つ新しいスコープブロックを作成:
   ```ts
   {
     const [, directive, name] = attr.name.raw.match(/^(v-newdir:|shorthand)(.+)$/i) ?? [];
     if (directive && name) {
       return {
         ...attr,
         potentialName: name, // HTML 属性にマッピングする場合
         isDirective: true as const, // Vue 専用の場合
         isDynamicValue: true as const, // 値が JavaScript の場合
       };
     }
   }
   ```
4. ビルド: `yarn build --scope @markuplint/vue-parser`
5. `src/index.spec.ts` にテストを追加:
   - 完全形: `v-newdir:value`
   - 省略形（該当する場合）
   - 修飾子付き（該当する場合）
6. テスト: `yarn test --scope @markuplint/vue-parser`

### 2. 要素タイプ検出の変更

1. `src/parser.ts` を読み、`detectElementType()` メソッドを見つける
2. マッチャー配列は以下をサポート:
   - **文字列リテラル** — 完全一致（例: `'Transition'`、`'component'`、`'slot'`）
   - **RegExp** — パターンマッチ（例: PascalCase 用の `/^[A-Z]/`）
3. 新しい Vue 組み込みコンポーネントを追加するには:
   ```ts
   detectElementType(nodeName: string) {
     return super.detectElementType(nodeName, [
       // Built-in components
       'Transition',
       'TransitionGroup',
       'KeepAlive',
       'Teleport',
       'Suspense',
       'NewBuiltIn',  // <-- ここに追加
       // Special elements
       'component',
       'slot',
       // Backward compatibility
       /^[A-Z]/,
     ]);
   }
   ```
4. ビルドとテスト: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`
5. `src/index.spec.ts` の `elementType` テストブロックにテストケースを追加

### 3. vue-eslint-parser バージョンサポートの更新

1. `src/vue-parser/index.ts` を読む — vue-eslint-parser のラッパー
2. vue-eslint-parser のリリースノートで破壊的変更を確認
3. 主な統合ポイント:
   - `VueESLintParser.parse(vueTemplate, { parser: false })` — メインのパース呼び出し
   - `ast.templateBody?.children` — テンプレートの子ノード
   - `ast.templateBody?.comments` — テンプレートのコメント
   - `VueESLintParser.AST.VElement` / `VText` / `VExpressionContainer` — ノードタイプ
4. AST 型が変更された場合、型エクスポートを更新:
   ```ts
   export type ASTNode =
     | VueESLintParser.AST.VElement
     | VueESLintParser.AST.VText
     | VueESLintParser.AST.VExpressionContainer;
   ```
5. ビルドとテスト: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`

### 4. テンプレートコメント注入の修正

1. `src/parser.ts` の `flattenNodes()` メソッドを読む
2. コメント注入のロジック:
   - コメントは `tokenize()` 中に `this.state.comments` に格納される
   - フラット化中、隣接するノードペアごとにコメントがその間にあるか確認
   - 範囲チェック: `lastOffset <= comment.range[0] && comment.range[1] <= node.startOffset`
3. よくある問題:
   - コメントが注入されない: 範囲チェックがギャップを正しくカバーしているか確認
   - コメントが間違った位置にある: `lastOffset` の計算を確認（`prevNode?.endOffset ?? node.parentNode?.endOffset ?? 0`）
   - ボーガスコメント検出: `betweenComment.type === 'HTMLBogusComment'` を検証
4. ビルドとテスト: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`

## 上流影響チェックリスト

上流パッケージへの変更がこのパッケージに影響を与える可能性があります:

| パッケージ                 | 影響                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `@markuplint/parser-utils` | 基底 `Parser` クラスの変更が全オーバーライドメソッドに影響する可能性あり |
| `@markuplint/ml-ast`       | AST 型の変更が nodeize() の戻り値の型の更新を必要とする可能性あり        |
| `vue-eslint-parser`        | AST 構造の変更が tokenize()、nodeize()、型の更新を必要とする可能性あり   |

上流パッケージが変更された場合、以下を実行:

```shell
yarn test --scope @markuplint/vue-parser
```

## トラブルシューティング

### Vue ディレクティブが認識されない

**症状:** `v-custom` のような Vue ディレクティブが `isDirective: true` としてマークされず、通常の HTML 属性として扱われる。

**原因:** `visitAttr()` でディレクティブパターンがマッチしないか、新しいディレクティブブロックが汎用 `v-*` キャッチオールの後に配置されている。

**解決策:**

1. ディレクティブブロックの正規表現パターンを確認 — 完全な属性名にマッチすることを確認
2. ブロックが `visitAttr()` 末尾の汎用 `v-*` キャッチオールの前に配置されていることを確認
3. 返却オブジェクトに `isDirective: true as const` が含まれていることを検証

### テンプレートコメントが AST に含まれていない

**症状:** Vue テンプレート内の HTML コメント（`<!-- ... -->`）がパースされたノードリストに存在しない。

**原因:** `flattenNodes()` でコメントが注入されていないか、`tokenize()` でキャプチャされていない。

**解決策:**

1. `tokenize()` を確認 — `ast.templateBody?.comments` が `this.state.comments` に格納されていることを検証
2. `flattenNodes()` を確認 — 範囲チェックロジックが隣接ノード間のコメントを見つけていることを検証
3. 特定のコメント位置でテストケースを追加し、`nodeListToDebugMaps` 出力を確認

### PascalCase コンポーネントが 'authored' として検出されない

**症状:** `<MyComponent>` のようなコンポーネントが `'authored'` ではなく `elementType: 'html'` となる。

**原因:** `detectElementType()` 内の `/^[A-Z]/` 正規表現がマッチしていないか、マッチャー配列が誤って構成されている。

**解決策:**

1. コンポーネント名が大文字で始まることを確認
2. `/^[A-Z]/` 正規表現がマッチャー配列に存在することを検証
3. `<component>` や `<slot>` のような小文字の Vue 組み込みは正規表現ではなく文字列でマッチされることに注意

### SyntaxError が正しく報告されない

**症状:** Vue テンプレートの構文エラーが `ParserError` を生成する代わりにプロセスをクラッシュさせる。

**原因:** `parseError()` メソッドがエラーをキャッチしていないか、エラーオブジェクトに `lineNumber`/`column` プロパティがない。

**解決策:**

1. `parseError()` を確認 — `instanceof SyntaxError` と `'lineNumber' in error` のチェックを検証
2. vue-eslint-parser のエラーには `lineNumber`（1ベース）と `column`（0ベース）が含まれる
3. フォールバックの `super.parseError(error)` は非 SyntaxError ケースを処理する
