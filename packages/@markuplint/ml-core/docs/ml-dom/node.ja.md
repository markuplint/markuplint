# MLNode / MLParentNode

## MLNode

**ソース:** `src/ml-dom/node/node.ts`

すべての markuplint DOM ノードラッパーの抽象基底クラスです。`MLToken` を継承し、DOM `Node` インターフェース準拠、ツリー走査、ルール設定アクセス、子ノード管理の機能を追加します。

### ノード型定数

| 定数                            | 値    | DOM Standard              |
| ------------------------------- | ----- | ------------------------- |
| `ELEMENT_NODE`                  | `1`   | はい                      |
| `ATTRIBUTE_NODE`                | `2`   | はい                      |
| `TEXT_NODE`                     | `3`   | はい                      |
| `CDATA_SECTION_NODE`            | `4`   | はい                      |
| `PROCESSING_INSTRUCTION_NODE`   | `7`   | はい                      |
| `COMMENT_NODE`                  | `8`   | はい                      |
| `DOCUMENT_NODE`                 | `9`   | はい                      |
| `DOCUMENT_TYPE_NODE`            | `10`  | はい                      |
| `DOCUMENT_FRAGMENT_NODE`        | `11`  | はい                      |
| `MARKUPLINT_PREPROCESSOR_BLOCK` | `101` | いいえ（markuplint 拡張） |

### ツリー構造プロパティ

| プロパティ              | 型                                                                 | 説明                                                                              |
| ----------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `parentNode`            | `MLDocument \| MLDocumentFragment \| MLElement \| null`            | DOM 準拠の親。透過的な `MLBlock` の親はスキップされる                             |
| `parentElement`         | `MLElement \| null`                                                | 最も近い `MLElement` である祖先                                                   |
| `syntacticalParentNode` | `MLDocument \| MLDocumentFragment \| MLElement \| MLBlock \| null` | `MLBlock` ノードを含む構文上の親                                                  |
| `childNodes`            | `NodeListOf<MLChildNode>`                                          | 子ノード（Element, Text, Comment, Block）。フラグメントの子はインライン展開される |
| `firstChild`            | `MLChildNode \| null`                                              | 最初の子ノード                                                                    |
| `lastChild`             | `MLChildNode \| null`                                              | 最後の子ノード                                                                    |
| `nextSibling`           | `MLChildNode \| null`                                              | 同じ `parentNode` を持つ次の兄弟ノード                                            |
| `previousSibling`       | `MLChildNode \| null`                                              | 同じ `parentNode` を持つ前の兄弟ノード                                            |
| `nextNode`              | `MLNode \| null`                                                   | 構文上の兄弟リスト内の次のノード（`syntacticalParentNode.childNodes` から）       |
| `prevNode`              | `MLNode \| null`                                                   | 構文上の兄弟リスト内の前のノード                                                  |
| `prevToken`             | `MLNode \| null`                                                   | ドキュメント順 `nodeList` 内の前のノード（省略された要素はスキップ）              |
| `ownerDocument`         | `any`                                                              | 所属するドキュメント（DOM 互換、`any` 型）                                        |
| `ownerMLDocument`       | `MLDocument<T, O>`                                                 | 適切なジェネリクス型を持つ所属ドキュメント                                        |
| `isFragment`            | `boolean`                                                          | このノードがフラグメントとして動作するかどうか                                    |

#### `nextNode`/`prevNode` と `nextSibling`/`previousSibling` の違い

この2組のプロパティは異なる目的に使用されます：

- **`nextNode`/`prevNode`**: `syntacticalParentNode.childNodes`（構文上の親がない場合は `nodeList`）の構文上の兄弟リストを走査します。`MLBlock` ノードを含み、AST レベルで動作します。
- **`nextSibling`/`previousSibling`**: 同じ DOM `parentNode` を共有する兄弟を走査します。`parentNode` が異なるノード（例：非透過ブロック内のノード）はスキップされます。

#### `prevToken` と省略された要素

`prevToken` はドキュメント順の `nodeList` を走査しますが、**省略された（ゴースト）要素をスキップ**します。省略された要素は対応するソーストークンを持たないため、それらを含めるとオフセット計算が壊れます。これはインデント解析やソース再構築にとって重要です。

### `childNodes` とフラグメント展開

子ノードが `isFragment === true` を持つ場合、その子ノード自身の子が親の `childNodes` にインライン展開されます：

```jsx
// JSX フラグメント
<div>
  <>
    {' '}
    {/* isFragment = true */}
    <p>A</p>
    <p>B</p>
  </>
  <p>C</p>
</div>
```

`div.childNodes` は `[<p>A</p>, <p>B</p>, <p>C</p>]` を返します -- フラグメントラッパーは透過的です。

### `parentNode` と MLBlock の透過性

`parentNode` ゲッターは `MLBlock` の透過性を処理します：

1. `syntacticalParentNode` を取得
2. 親が `isTransparent === true` の `MLBlock` の場合：ブロックの `parentNode` を返す（再帰的にスキップ）
3. 親が `isTransparent === false` の `MLBlock` の場合：`null` を返す（DOM の観点からノードは「孤立」している）
4. 親がフラグメント `MLDocument`（つまり `isFragment === true`）の場合：`null` を返す
5. それ以外の場合：親をそのまま返す

| シナリオ                                    | `syntacticalParentNode` | `parentNode`                |
| ------------------------------------------- | ----------------------- | --------------------------- |
| `<body>` 内の `<div>`                       | `<body>`                | `<body>`                    |
| `<div>` 内の Pug `if` ブロック内の `<span>` | `#ml-block`             | `<div>`（透過的にスキップ） |
| 非透過ブロック内の `<span>`                 | `#ml-block`             | `null`                      |
| フラグメントドキュメントのトップレベル      | `#document`             | `null`                      |

```pug
//- Pug の例
div
  if foo
    span
    //- syntacticalParentNode: #ml-block
    //- parentNode: <div>  (ブロックは透過的、スキップされる)
```

### `conditionalChildNodes()` -- 条件分岐パターン生成

テンプレートエンジンの条件分岐から可能なすべての子ノードの組み合わせを生成します。これは `permitted-contents` などのルールが、すべてのレンダリングパスに対してコンテンツモデルを検証するために使用されます。

#### アルゴリズム

1. `childNodes` を順番に走査する
2. `MLBlock` に遭遇した場合、その `conditionalType` から分岐 `mode` を決定する：
   - `'if'` または `'if:elseif'` → mode `'if'`
   - `'each'` → mode `'each'`
   - `'switch:case'` → mode `'switch'`
   - `'if:else'`、`'each:empty'`、`'switch:default'`、`'await'`、`'await:catch'`、`'await:then'` → 現在のモードを継続
   - その他の型 → スキップ（条件分岐ではない）
3. ブロックに対して再帰的に `conditionalChildNodes()` を呼び出し、サブパターンを取得する
4. 分岐を収集する。非ブロックの子に到達したら、現在の分岐グループを閉じる
5. 空白のみのテキストノードはスキップされる
6. `'if'`、`'each'`、`'switch'` モードの場合：「空の分岐」（何もレンダリングされないケース）を表す `null` センチネルが追加される
7. 収集した分岐を `branchesToPatterns()` に渡し、すべての組み合わせの直積を生成する

#### 例

```html
<ul>
  {% if cond %}
  <li>A</li>
  {% else %}
  <li>B</li>
  {% endif %}
  <li>C</li>
</ul>
```

`ul.conditionalChildNodes()` は以下を返します：

- パターン 1: `[<li>A</li>, <li>C</li>]`
- パターン 2: `[<li>B</li>, <li>C</li>]`

`permitted-contents` ルールは**すべての**パターンを検査して妥当性を確認します。

### `findSubsequentNodes(selector?)`

ドキュメント順でこのノードの後に出現するノードを収集します：

1. `ownerMLDocument.nodeList` を反復する
2. `endOffset <= this.endOffset` のノードをスキップする
3. 子孫ノードをスキップする（`this.contains(node)` で判定）
4. `selector` が指定されている場合：CSS セレクタにマッチする要素のみを含める
5. `selector` が未指定の場合：すべての後続 `MLChildNode` インスタンス（Element, Text, Comment, Block）を含める

### ルールプロパティ

| プロパティ | 型                        | 説明                                                    |
| ---------- | ------------------------- | ------------------------------------------------------- |
| `rules`    | `Record<string, AnyRule>` | `RuleMapper` によってこのノードにマッピングされたルール |
| `rule`     | `RuleInfo<T, O>`          | 現在のルールのこのノードに対する解決済み設定            |

`rule` ゲッターは、現在評価中のルール（`document.currentRule.name` 経由）の設定を `rules` レコードから取得し、`optimizeOption()` で解決します。現在評価中のルールがない場合はエラーをスローします。

### `is()` による型の絞り込み

`is()` メソッドは `this is NodeTypeOf<NType, T, O>` を返し、TypeScript の型の絞り込みを可能にします：

```typescript
function processNode(node: MLNode<any, any>) {
  if (node.is(node.ELEMENT_NODE)) {
    // node は MLElement<any, any> に絞り込まれる
    console.log(node.localName);
  } else if (node.is(node.TEXT_NODE)) {
    // node は MLText<any, any> に絞り込まれる
    console.log(node.isWhitespace());
  } else if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
    // node は MLBlock<any, any> に絞り込まれる
    console.log(node.conditionalType);
  }
}
```

## MLParentNode

**ソース:** `src/ml-dom/node/parent-node.ts`

子を持てるノード（`MLElement`、`MLDocument`、`MLDocumentFragment`）の抽象基底クラスです。DOM `ParentNode` ミックスインを実装します。

### プロパティ

| プロパティ          | 型                            | 説明                                 |
| ------------------- | ----------------------------- | ------------------------------------ |
| `children`          | `HTMLCollectionOf<MLElement>` | 要素のみの子ノード（キャッシュ済み） |
| `childElementCount` | `number`                      | 子要素の数                           |
| `firstElementChild` | `MLElement \| null`           | 最初の子要素                         |
| `lastElementChild`  | `MLElement \| null`           | 最後の子要素                         |

### メソッド

| メソッド           | シグネチャ                                                   | 説明                                                                       |
| ------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `querySelector`    | `querySelector(selectors: string): MLElement \| null`        | CSS セレクタにマッチする最初の子孫要素                                     |
| `querySelectorAll` | `querySelectorAll(selectors: string): NodeListOf<MLElement>` | CSS セレクタにマッチするすべての子孫要素（セレクタ文字列ごとにキャッシュ） |

### `_descendantsToArray(filter?)`

`syncWalk` を使ってツリーを再帰的に走査し、フィルタされた子孫の配列を返す protected メソッドです。`querySelectorAll` の内部で使用されます。
