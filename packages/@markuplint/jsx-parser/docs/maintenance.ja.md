# メンテナンスガイド

## コマンド

| コマンド                                    | 説明                   |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/jsx-parser` | このパッケージをビルド |
| `yarn dev --scope @markuplint/jsx-parser`   | ウォッチモードでビルド |
| `yarn clean --scope @markuplint/jsx-parser` | ビルド成果物を削除     |
| `yarn test --scope @markuplint/jsx-parser`  | テストを実行           |

## テスト

テストファイルは `*.spec.ts` の命名規則に従い、`src/` ディレクトリに配置されています:

| テストファイル  | カバレッジ                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| `index.spec.ts` | JSXParser 統合テスト（JSX/TSX パース、属性、名前空間、要素型、親子関係）       |
| `jsx.spec.ts`   | JSX 抽出ユーティリティテスト（スプレッド属性検出、コメント抽出、getName 解決） |

主なテストパターンでは `nodeListToDebugMaps` を使用したスナップショット形式のアサーションを行います:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const ast = parser.parse('<div className="foo">text</div>');
const maps = nodeListToDebugMaps(ast.nodeList);
expect(maps).toStrictEqual([
  // 期待されるデバッグ出力
]);
```

属性テストには `attributesToDebugMaps` を使用します:

```ts
import { attributesToDebugMaps } from '@markuplint/parser-utils';

const ast = parser.parse('<Component className="foo" />');
// @ts-ignore
const attrMaps = attributesToDebugMaps(ast.nodeList[0].attributes);
expect(attrMaps).toStrictEqual([
  // 期待される属性デバッグ出力
]);
```

## レシピ

### 1. 新しい IDL 属性マッピングの追加

1. `@markuplint/parser-utils/src/idl-attributes.ts` を読む
2. `idlContentMap` オブジェクトに新しいエントリを追加:
   - キー: IDL プロパティ名（キャメルケース、例: `className`）
   - 値: コンテンツ属性名（小文字/ハイフン区切り、例: `class`）
3. ビルド: `yarn build --scope @markuplint/parser-utils --scope @markuplint/jsx-parser`
4. `src/index.spec.ts` に `attributesToDebugMaps` を使用したテストを追加して検証:
   - `potentialName` がコンテンツ属性名に設定されている
   - 生の名前が IDL プロパティ名と異なる場合 `candidate` が設定されている
5. テスト: `yarn test --scope @markuplint/jsx-parser`

### 2. 新しい AST ノード型の処理

`@typescript-eslint` が新しい `AST_NODE_TYPES` 値を導入した場合:

1. `src/jsx.ts` を読み、`recursiveSearchJSXElements()` の switch 文を確認
2. 新しいノード型のどのプロパティが JSX を含み得るかを判定:
   - `@typescript-eslint/types` の `TSESTree` 型定義を確認
   - JSX 要素を含み得る配列やnull許容参照のプロパティを探す
3. switch 文に新しい `case` を追加:
   - JSX を含み得ないリーフノード: 既存の `continue` ブロックに追加
   - 子配列を持つノード: `jsxList.push(...recursiveSearchJSXElements(node.someArray, parentId));`
   - null許容の子を持つノード: `jsxList.push(...recursiveSearchJSXElements([node.child ?? null], parentId));`
4. ビルド: `yarn build --scope @markuplint/jsx-parser`
5. `src/index.spec.ts` に新しい構文を使用したテストを追加
6. テスト: `yarn test --scope @markuplint/jsx-parser`

### 3. 要素型検出の変更

1. `src/parser.ts` を読み、`detectElementType()` メソッドを確認
2. 現在の正規表現 `/^[A-Z]|\./` の分類:
   - 大文字で始まるまたはドット → `authored`（React コンポーネント、メンバー式）
   - `x-` プレフィックス → `web-component`（基底クラスで処理）
   - その他すべての小文字 → `html`
3. 正規表現を修正するか、`super.detectElementType()` 呼び出し前に条件ロジックを追加
4. ビルド: `yarn build --scope @markuplint/jsx-parser`
5. `src/index.spec.ts` の `isCustomElement` テストを更新
6. テスト: `yarn test --scope @markuplint/jsx-parser`

### 4. コメントマスキングの変更

1. `src/parser.ts` を読み、`nodeize()` の `JSXElement`/`JSXFragment` ブランチ内のコメントマスキングロジックを確認
2. マスキングはコメント文字をスペースに置換しつつ改行を保持: `commentToken.raw.replaceAll(/[^\n]/g, ' ')`
3. 変更時の注意点:
   - マスクされたトークンは行の境界を保持する（改行は残す必要がある）
   - 置換は同じ文字列長を維持する（オフセット位置がそれに依存）
   - 開始タグの範囲外のコメントはスキップされる
4. ビルド: `yarn build --scope @markuplint/jsx-parser`
5. `src/index.spec.ts` の「Comment in element」テストケースをテスト
6. テスト: `yarn test --scope @markuplint/jsx-parser`

### 5. afterTraverse の親子関係再構築の変更

1. `src/parser.ts` を読み、`afterTraverse()` メソッドを確認
2. アルゴリズムを理解:
   - ツリー内のすべての `psblock` ノードを走査
   - 各 psblock について、同じ `__parentId` を持つ孤児ノードを検索
   - マッチする孤児を psblock の子として追加
3. 変更時の注意点:
   - `#parentIdMap` WeakMap は `nodeize()` 内ですべてのノード型について設定する必要がある
   - 子を追加する際に深さを `psBlockNode.depth + 1` に更新する必要がある
   - doctype ノードは養子縁組から明示的に除外される
4. ビルド: `yarn build --scope @markuplint/jsx-parser`
5. `src/index.spec.ts` の「Parent-child relationship」テストをテスト
6. テスト: `yarn test --scope @markuplint/jsx-parser`

## 上流影響チェックリスト

上流パッケージへの変更がこのパーサーに影響を与える可能性があります:

| パッケージ                 | jsx-parser への影響         |
| -------------------------- | --------------------------- |
| `@markuplint/parser-utils` | `Parser` 基底クラスの変更   |
| `@markuplint/html-parser`  | `getNamespace()` の動作変更 |
| `@markuplint/ml-ast`       | AST 型定義の変更            |

上流パッケージが更新された際は以下を実行してください:

```shell
yarn test --scope @markuplint/jsx-parser
```

## トラブルシューティング

### パース中に「Unsupported node」エラー

**症状:** 有効な JSX/TSX コードで `Error: Unsupported node` のパースエラーが発生。

**原因:** `jsx.ts` の `recursiveSearchJSXElements()` 関数が、`@typescript-eslint` のアップデートで導入された新しい `AST_NODE_TYPES` 値を処理していない。

**解決策:**

1. どの `AST_NODE_TYPES` 値が未処理か確認（スタックトレースを確認）
2. `recursiveSearchJSXElements()` の switch 文に新しい `case` を追加
3. 上記レシピ #2 を参照

### IDL 属性が正しくマッピングされない

**症状:** `className` のような JSX 属性が AST 出力で `potentialName: class` を取得しない。

**原因:** 属性が `@markuplint/parser-utils/src/idl-attributes.ts` の `idlContentMap` にない、または `@markuplint/react-spec` が `acceptedAttrNames: 'idl'` を設定していない。

**解決策:**

1. `@markuplint/parser-utils/src/idl-attributes.ts` でマッピングを確認
2. 属性名の大文字小文字が IDL プロパティ名と一致することを検証
3. 新しいマッピングの追加は上記レシピ #1 を参照

### JSX タグ内のコメントがパースエラーを引き起こす

**症状:** 開始タグ内にコメントを含む JSX 要素（例: `<div /* comment */ attr="value" />`）で不正な属性パースが発生。

**原因:** `nodeize()` 内のコメントマスキングがコメントテキストを正しくスペースに置換していない。

**解決策:**

1. `nodeize()` の `JSXElement`/`JSXFragment` ブランチ内のコメントマスキングロジックを確認
2. `comment.range` が `openTag.range` に対して正しく比較されていることを検証
3. 置換が改行を保持し、文字列長を維持していることを確認

### 式コンテナの親子関係が不正

**症状:** `{expression}` コンテナ内のノードが AST で式コンテナの子として正しくネストされていない。

**原因:** `nodeize()` 内で `#parentIdMap` が正しく設定されていないか、`afterTraverse()` のマッチングロジックにバグがある。

**解決策:**

1. `nodeize()` のすべてのブランチが `originNode.__parentId` でノードを `#parentIdMap` に登録していることを確認
2. `recursiveSearchJSXElements()` が `__parentId` 値を正しく割り当てていることを確認
3. `afterTraverse()` のマッチング: `nParentId === dParentId` の比較を検証
