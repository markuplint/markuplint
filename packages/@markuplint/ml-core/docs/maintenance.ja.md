# メンテナンスガイド

## コマンド

```bash
# ビルド
yarn build --scope @markuplint/ml-core

# ウォッチモード
yarn dev --scope @markuplint/ml-core

# ビルド出力のクリーン
yarn clean --scope @markuplint/ml-core

# テスト（リポジトリルートから）
yarn test --scope @markuplint/ml-core
```

## テスト

### テストファイル

| ファイル            | 用途                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| `src/test/index.ts` | テストユーティリティエクスポート（`createTestDocument`, `createTestElement` など） |

### テストユーティリティの使用

パッケージは `@markuplint/rules` や他のコンシューマーで一般的に使用されるテストヘルパーを提供します：

```typescript
import { createTestDocument, createTestElement, dummySchemas } from '@markuplint/ml-core';

// HTML をテスト用 MLDocument にパース
const doc = createTestDocument('<div class="foo"><p>Hello</p></div>');

// ノードリストにアクセス
for (const node of doc.nodeList) {
  console.log(node.nodeName);
}

// 最初の要素を直接取得
const el = createTestElement('<button type="submit">Click</button>');
console.log(el.localName); // 'button'
console.log(el.getAttribute('type')); // 'submit'
```

### カスタム設定でのテスト

```typescript
const doc = createTestDocument('<div></div>', {
  config: {
    rules: {
      'my-rule': true,
    },
    nodeRules: [{ selector: 'div', rules: { 'my-rule': 'custom-value' } }],
  },
});
```

### カスタムパーサーでのテスト

```typescript
import { parser as vueParser } from '@markuplint/vue-parser';

const doc = createTestDocument('<template><div></div></template>', {
  parser: vueParser,
});
```

## レシピ

### 1. MLDOM ノードクラスへのプロパティ追加

1. `src/ml-dom/node/` 内の対象クラスを特定（例：`MLElement` の場合 `element.ts`）
2. ゲッターまたは readonly フィールドとしてプロパティを追加
3. プロパティが AST データから派生する場合、`this.#astNode`（プライベート AST 参照）を使用
4. プロパティが仕様データを必要とする場合、`this.ownerMLDocument.specs` 経由でアクセス
5. 新しい型を導入する場合、`src/ml-dom/node/types.ts` の型定義を更新
6. ビルドを検証：`yarn build --scope @markuplint/ml-core`

**例：MLElement に `hasId` プロパティを追加**

```typescript
// src/ml-dom/node/element.ts 内
get hasId(): boolean {
  return this.hasAttribute('id');
}
```

### 2. DOM API 更新への対応（TypeScript DOM 型定義の変更）

TypeScript 組み込みの DOM 型定義が更新された場合（例：`Element` や `Node` に新しいプロパティが追加された場合）、それらのインターフェースを `implements` している MLDOM クラスで型エラーが発生します。これは意図的な設計です -- 気づかないうちにギャップが生じることを防ぎます。

**プロセス：**

1. `yarn build --scope @markuplint/ml-core` を実行し、型エラーを収集する
2. 不足しているプロパティやメソッドごとに判断する：
   - **実装する**: API がリントルールに有用な場合（例：`querySelector`、`getAttribute`）→ 実際のロジックを実装する
   - **非サポートにする**: API が静的解析で意味を持たない場合（例：`requestFullscreen`、`animate`）→ `UnexpectedCallError` をスローするスタブを追加する
3. 非サポートのスタブは既存のパターンに従う：

```typescript
/**
 * **IT THROWS AN ERROR WHEN CALLING THIS.**
 *
 * @unsupported
 * @implements DOM API: `Element`
 */
someNewMethod(): void {
  throw new UnexpectedCallError('Not supported "someNewMethod" method');
}
```

4. ビルドが通ることを確認する：`yarn build --scope @markuplint/ml-core`

### 3. 新しいリンティングルールの作成

ルールは `@markuplint/rules` に配置されますが、このパッケージの `createRule` API を使用します：

```typescript
import { createRule } from '@markuplint/ml-core';

export default createRule({
  defaultSeverity: 'error',
  defaultValue: true,
  async verify({ document, report, t }) {
    await document.walkOn('Element', el => {
      if (/* 違反条件 */) {
        report({
          scope: el,
          message: t('違反メッセージ'),
        });
      }
    });
  },
});
```

ルールを単体テストする場合、`src/ml-rule/create-test-rule.ts` の `createTestRule` を使用：

```typescript
import { createRule as createTestRule } from '@markuplint/ml-core/test';
const rule = createTestRule({ name: 'my-rule', ...seed });
```

### 4. Pretender 設定の変更

pretender は `MLDocument` コンストラクタ（`src/ml-dom/node/document.ts`）で処理されます：

1. pretender 定義は `MLFabric.pretenders` から取得
2. ドキュメント構築時に、各要素が pretender セレクタに対してチェックされる
3. マッチする要素に `pretenderContext` が割り当てられる
4. pretender の動作を変更するには、`MLDocument` の pretender 初期化ロジックを修正
5. `createTestDocument` の `pretenders` オプションでテスト

### 5. ルールマッピングロジックの変更（RuleMapper）

`RuleMapper` クラス（`src/ml-dom/node/rule-mapper.ts`）はルールのノードへの適用方法を制御します：

1. `apply()` はグローバルルール、nodeRules、childNodeRules を順に処理
2. マッチするセレクタごとに、詳細度付きの `MappingLayer` を作成
3. `set()` はレイヤーを対象ノードに割り当て、詳細度で競合を解決
4. 新しいマッピングソースを追加するには、`apply()` に新しい反復ブロックを追加し、適切な `from` 値を定義

### 6. walkOn に新しいノードタイプを追加

`walkOn()` は `MLDocument`（`src/ml-dom/node/document.ts`）で定義されています：

1. `type` パラメータのユニオンに新しいケースを追加：`'Element' | 'Text' | 'Comment' | 'Attr' | 'ElementCloseTag' | 'NewType'`
2. `walkOn()` メソッドに `nodeList` からマッチするノードを選択するフィルタリングロジックを追加
3. 必要に応じて `src/ml-dom/helper/walkers.ts` の `Walker` 型を更新
4. `walkOn()` を使用する `@markuplint/rules` の下流コードを更新

## 下流影響チェックリスト

`@markuplint/ml-core` の変更は以下に影響を与える可能性があります：

- [ ] **`@markuplint/rules`** — すべての組み込みルールが MLDOM クラスと `createRule` に依存
  - ノードのプロパティ/メソッドの変更はそれらにアクセスするルールに影響
  - `walkOn()` や `MLRuleContext` の変更はすべてのルールに影響
  - `RuleMapper` の変更はルール設定の解決に影響
- [ ] **`markuplint`** — CLI と API が `MLCore`, `ViolationCollector`, `convertRuleset` に依存
  - `MLCore.verify()` のシグネチャや動作の変更は `MLEngine` に影響
  - `MLFabric` 型の変更はエンジンの初期化に影響

## トラブルシューティング

### ルールが実行されない

1. ルールがルールセット設定（`rules` フィールド）に登録されているか確認
2. ルール名が完全に一致しているか確認（大文字小文字を区別）
3. `RuleMapper` の出力を確認：`document.debugMap()` でルールマッピングを確認
4. ルールの `walkOn` タイプが期待するノードタイプと一致しているか確認
5. nodeRules/childNodeRules のセレクタがグローバルルールを無効にオーバーライドしていないか確認

### Pretender が効かない

1. pretender セレクタが対象要素にマッチするか確認：`element.matches(selector)` でテスト
2. pretender 定義が `MLFabric.pretenders` を通じて渡されているか確認
3. pretender の `as` 値が有効な HTML 要素名であることを確認
4. ドキュメント構築後に `element.pretenderContext` が `null` でないことを確認

### DOM ツリー構造が不正

1. `document.debugMap()` の出力を期待される構造と比較
2. パーサー出力を確認：同じソースをパーサーで直接パースして AST を検査
3. ゴースト要素（暗黙の HTML/head/body）が正しく処理されているか確認
4. テンプレートエンジンの場合、`conditionalType` 付きの `MLBlock` ノードが期待される子をラップしているか確認
5. `document.nodeList` でフラットノードリストを検査し、親子関係を確認
