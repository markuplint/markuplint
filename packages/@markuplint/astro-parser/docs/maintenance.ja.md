# メンテナンスガイド

## コマンド

| コマンド                                      | 説明                   |
| --------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/astro-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/astro-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/astro-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/astro-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル         | カバレッジ                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| `parser.spec.ts`       | AstroParser 統合テスト（フロントマター、式、属性、名前空間、フラグメント） |
| `astro-parser.spec.ts` | astro-eslint-parser ラッパーテスト（生の AST 出力、属性の種類、診断）      |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/astro-parser';

const doc = parser.parse('<div class:list={["a"]}>{name}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

`nodeListToDebugMaps` の第2引数 `true` は出力に属性の詳細を含め、ディレクティブや動的な値の処理をテストする際に不可欠です。

## レシピ

### 1. 新しいテンプレートディレクティブの追加

1. `src/parser.ts` を読む — `visitAttr()` メソッド、特に `switch (lowerCaseDirectiveName)` ブロック
2. ディレクティブプレフィックスに新しい `case` を追加:
   - ディレクティブが標準 HTML 属性にマッピングされる場合（`class:list` → `class` のように）、`potentialName` を HTML 属性名に設定
   - ディレクティブが Astro 固有の場合（`set:html` のように）、`isDirective = true` を設定
3. 例 — `style` にマッピングする仮の `style:inline` ディレクティブを追加:
   ```ts
   case 'style': {
     potentialName = lowerCaseDirectiveName;
     break;
   }
   ```
4. ビルド: `yarn build --scope @markuplint/astro-parser`
5. `src/parser.spec.ts` にテストケースを追加:
   ```ts
   test('style:inline directive', () => {
     const ast = parse('<div style:inline={styles}></div>');
     const map = nodeListToDebugMaps(ast.nodeList, true);
     // potentialName: style と isDynamicValue: true を検証
   });
   ```
6. テスト: `yarn test --scope @markuplint/astro-parser`

### 2. 名前空間スコーピングの変更

1. `src/parser.ts` を読む — `#updateScopeNS()` プライベートメソッド
2. このメソッドには2つの条件がある:
   - XHTML → SVG: 現在の名前空間が XHTML で、ノードが `<svg>` 要素の場合
   - SVG → XHTML: 現在の名前空間が SVG で、親が `<foreignObject>` の場合
3. 新しい名前空間遷移を追加する場合（例: MathML）:
   ```ts
   if (
     parentNS === 'http://www.w3.org/1999/xhtml' &&
     originNode.type === 'element' &&
     originNode.name?.toLowerCase() === 'math'
   ) {
     this.state.scopeNS = 'http://www.w3.org/1998/Math/MathML';
   }
   ```
4. ビルドとテスト: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser`
5. `src/parser.spec.ts` に名前空間テストケースを追加:
   ```ts
   test('MathML namespace', () => {
     const doc = parse('<div><math><mi>x</mi></math></div>');
     expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/1998/Math/MathML');
   });
   ```

### 3. 式の処理の更新

1. `src/parser.ts` を読む — `nodeize()` 内の `case 'expression'` ブロック
2. 式の分割ロジックは以下のように動作する:
   - 式に複数の子がある場合（`firstChild !== lastChild`）:
     - 開始フラグメント: 式の開始から最初の子の終了まで
     - 終了フラグメント: 最後の子の開始から式の終了まで
     - 子は開始フラグメントの psblock 内で訪問される
   - 式に子が1つまたは子がない場合:
     - 式全体が1つの MustacheTag psblock として出力される
3. 変更時の注意:
   - `sliceFragment()` のオフセットが開始フラグメントと終了フラグメントの両方で正しいことを確認
   - 終了フラグメントは `isFragment: false` である必要がある
   - 開始フラグメントは `isFragment: true` で、子の訪問のために `originNode.children` を渡す必要がある
4. ビルドとテスト: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser`
5. 複雑な式でテスト:
   ```ts
   test('Nested expression with HTML', () => {
     const ast = parse('<ul>{list.map(item => <li>{item}</li>)}</ul>');
     const map = nodeListToDebugMaps(ast.nodeList);
     // 開始 MustacheTag、ネストされた要素、終了 MustacheTag を検証
   });
   ```

## 上流影響チェックリスト

上流パッケージの変更がこのパーサーに影響を与える可能性があります:

| パッケージ                 | 影響                                                        |
| -------------------------- | ----------------------------------------------------------- |
| `@markuplint/parser-utils` | 基底 `Parser` クラスの変更は全オーバーライドメソッドに影響  |
| `@markuplint/ml-ast`       | AST 型の変更は `nodeize()` の戻り値の型に影響               |
| `astro-eslint-parser`      | パーサー出力形式の変更は `tokenize()` と `nodeize()` に影響 |

`astro-eslint-parser` を更新する場合:

```shell
# ランタイム依存を更新
yarn upgrade astro-eslint-parser --scope @markuplint/astro-parser

# 型用の開発依存を更新
yarn upgrade @astrojs/compiler --scope @markuplint/astro-parser --dev

# 互換性を検証
yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser
```

## トラブルシューティング

### フロントマターが認識されない

**症状:** `---...---` ブロックが Frontmatter psblock としてパースされない、またはその内容が HTML AST に漏れる。

**原因:** `astro-eslint-parser` が `type: 'frontmatter'` ノードを生成していないか、ノードの位置オフセットが不正。

**解決策:**

1. `src/astro-parser.spec.ts` にテストを追加し、`astroParse()` からの生の AST 出力を検証
2. フロントマターノードの `position.start.offset` と `position.end.offset` が正しいことを確認
3. `nodeize()` の `case 'frontmatter'` ブランチに到達していることを検証

### 式の分割で不正なオフセットが生成される

**症状:** MustacheTag psblock ノードの開始/終了位置が不正、または式内のネストされた HTML 要素の位置がずれている。

**原因:** `case 'expression'` ブランチの `sliceFragment()` 呼び出しが Astro AST の子から間違ったオフセットを使用している。

**解決策:**

1. `firstChild.position?.end?.offset` と `lastChild.position?.start.offset` を確認 — これらは Astro AST の位置と正確に一致する必要がある
2. `startExpressionEndOffset` が式の開始と最初の HTML 子の間にあることを検証
3. `nodeListToDebugMaps` を使用して実際の位置と期待される位置を比較

### 名前空間が正しく適用されない

**症状:** `<svg>` 内の要素が XHTML 名前空間を持つ、または `<foreignObject>` 内の要素が SVG 名前空間を持つ。

**原因:** `#updateScopeNS()` が要素タイプを正しく検出していないか、`scopeNS` 状態がリセットされていない。

**解決策:**

1. `originNode.type === 'element'` を確認 — 要素ノードのみが名前空間の変更をトリガー
2. `originNode.name?.toLowerCase()` を確認 — `svg` の比較はケースインセンシティブである必要がある
3. `parentNode.nodeName === 'foreignObject'` の比較を確認 — これは Astro AST の名前ではなく markuplint のノード名を使用
4. 特定のネストパターンのテストケースを `src/parser.spec.ts` に追加

### テンプレートディレクティブが検出されない

**症状:** `set:html={content}` のような属性に `isDirective: true` が設定されない、または `class:list` に `potentialName: 'class'` が設定されない。

**原因:** 正規表現 `/^([^:]+):([^:]+)$/` がマッチしなかった、またはスイッチケースが欠落。

**解決策:**

1. 属性名の形式を確認 — 正規表現はコロンが1つだけで、両側に空でない部分が必要
2. `switch (lowerCaseDirectiveName)` を確認 — ディレクティブプレフィックスがケースにマッチする必要がある
3. 新しいディレクティブプレフィックスの場合は、新しいケースを追加（レシピ #1 参照）
