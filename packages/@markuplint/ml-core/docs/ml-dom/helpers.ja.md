# ヘルパーとユーティリティ

## ヘルパー関数

### createNode()

**ソース:** `src/ml-dom/helper/create-node.ts`

AST ノード型を対応する MLDOM コンストラクタにディスパッチするファクトリ関数です。

| AST `type` フィールド             | MLDOM クラス                                                      | `nodeType` |
| --------------------------------- | ----------------------------------------------------------------- | ---------- |
| `'doctype'`                       | `MLDocumentType`                                                  | `10`       |
| `'starttag'`                      | `MLElement`                                                       | `1`        |
| `'comment'`                       | `MLComment`                                                       | `8`        |
| `'text'`                          | `MLText`                                                          | `3`        |
| `'psblock'`                       | `MLBlock`                                                         | `101`      |
| `'invalid'`（`kind: 'starttag'`） | `MLElement`（`x-invalid`、`elementType: 'web-component'` として） | `1`        |
| `'invalid'`（その他の kind）      | `MLText`                                                          | `3`        |

**注:** `'endtag'` は `createNode()` を通過しません -- ドキュメントのコンストラクション中にスキップされます。`MLElement` は `pairNode` 参照から内部的に `MLElementCloseTag` を作成します。`MLASTAttr` は `MLElement` によって処理され、要素の `attributes` 配列から `MLAttr` インスタンスを作成します。

### ウォーカー

**ソース:** `src/ml-dom/helper/walkers.ts`

#### `syncWalk(nodeList, walker)`

同期的な深さ優先ツリー走査です。`nodeList` の各ノードに対して：

- ノードが `ELEMENT_NODE` または `MARKUPLINT_PREPROCESSOR_BLOCK` の場合：まず子を再帰的に走査し、**それから**ノードに対して walker を呼び出す（後順走査）

#### `sequentialWalker(list, walker)`

逐次的な非同期走査です。walker が同期か非同期かに関わらず、walker が一度に1つずつ実行されることを保証します。内部のプロミスチェーンを使って逐次実行します。

### accname

**ソース:** `src/ml-dom/helper/accname.ts`

#### `getAccname(element, version)`

WAI-ARIA アルゴリズムに従って要素のアクセシブル名を計算します：

1. `@markuplint/ml-spec` の `get()` 関数で直接計算を試みる（`aria-label`、`aria-labelledby` などを処理）
2. 要素が ARIA 設定を持つ pretender コンテキストを持つ場合 → `getAccnameFromPretender()` を使用する：
   - pretender 設定から `aria.name` プロパティを読み取る
   - `name` が `fromAttr` を持つオブジェクトの場合 → 元の要素から指定された属性の値を読み取る
3. 要素が `aria-hidden="true"` または `hidden` 属性を持つ場合 → 空文字列を返す
4. ロールが `accessibleNameFromContent` をサポートする場合 → 子のテキストコンテンツを再帰的に連結する
5. それ以外の場合 → 空文字列を返す

### getIndent

**ソース:** `src/ml-dom/helper/get-indent.ts`

#### `getIndent(node)`（非推奨）

隣接するテキストノードの空白を調べて、ノードの前のインデントを解析します。

`MLDOMIndentation` を返します：

| プロパティ/メソッド | 型                                      | 説明                                                                         |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| `raw`               | `string`                                | インデント文字列                                                             |
| `type`              | `'tab' \| 'space' \| 'mixed' \| 'none'` | インデントの種類                                                             |
| `width`             | `number`                                | インデントの文字数                                                           |
| `line`              | `number`                                | インデントが発生する行番号                                                   |
| `fix(raw)`          | メソッド                                | ソーステキストノード内の対応する行のインデントを変更してインデントを置換する |

`fix()` メソッドはテキストノードの `raw` を改行で分割し、対象行のインデントを置換し、再結合した文字列でテキストノードの `fix()` を呼び出します。

## 補助クラス

### MLNamedNodeMap

**ソース:** `src/ml-dom/node/named-node-map.ts`

`Array<MLAttr>` を継承し、DOM `NamedNodeMap` インターフェースを実装します。`MLElement.attributes` で使用されます。

- **重複排除**: 各属性名の最初の出現のみが保持される
- **`getNamedItem(qualifiedName)`**: 大文字小文字を区別する名前検索。`MLAttr | null` を返す
- **`item(index)`**: インデックスベースのアクセス
- ミューテーションメソッド（`setNamedItem`、`removeNamedItem` など）は `UnexpectedCallError` をスローする

#### `toNamedNodeMap(nodes)`

`MLAttr` の読み取り専用配列から `MLNamedNodeMap` を作成するヘルパー関数です。

### MLDomTokenList

**ソース:** `src/ml-dom/node/dom-token-list.ts`

`Array<string>` を継承し、DOM `DOMTokenList` インターフェースを実装します。スペース区切りの属性値（例：`class`）に使用されます。

| プロパティ/メソッド | 型               | 説明                                           |
| ------------------- | ---------------- | ---------------------------------------------- |
| `value`             | `string`         | 元の属性値文字列                               |
| `contains(token)`   | `boolean`        | セットベースの高速なトークン存在チェック       |
| `allTokens()`       | `Scope[]`        | 各トークンの位置情報（`Scope`）を返す          |
| `pick(token)`       | `Scope \| null`  | 特定のトークンの位置情報を返す                 |
| `add(...tokens)`    | `void`           | トークンを追加する（基となる属性値を変更する） |
| `item(index)`       | `string \| null` | インデックスベースのトークンアクセス           |
| `forEach(callback)` | `void`           | コールバックでトークンを反復する               |
| `toString()`        | `string`         | 元の `value` 文字列を返す                      |

ミューテーションメソッド（`remove`、`replace`、`toggle`、`supports`）は `UnexpectedCallError` をスローします。

`Scope` オブジェクトには、属性値内の各トークンの正確なソース位置として `startOffset`、`endOffset`、`startLine`、`startCol`、`endLine`、`endCol` が含まれます。

## 型ユーティリティ

**ソース:** `src/ml-dom/node/types.ts`

### MappedNode

TypeScript の型レベルで AST ノード型を対応する MLDOM ラッパー型にマッピングします：

```typescript
type MappedNode<N, T, O> = N extends MLASTElement
  ? MLElement<T, O>
  : N extends MLASTComment
    ? MLComment<T, O>
    : N extends MLASTText
      ? MLText<T, O>
      : N extends MLASTDoctype
        ? MLDocumentType<T, O>
        : N extends MLASTPreprocessorSpecificBlock
          ? MLBlock<T, O>
          : N extends MLASTAttr
            ? MLAttr<T, O>
            : N extends MLASTInvalid
              ? MLText<T, O>
              : N extends MLASTToken
                ? MLToken
                : never;
```

### NodeTypeOf

数値のノード型定数を MLDOM クラス型に解決し、`is()` 型ガードを有効にします：

```typescript
type NodeTypeOf<NT, T, O> = NT extends 1
  ? MLElement<T, O> // ELEMENT_NODE
  : NT extends 8
    ? MLComment<T, O> // COMMENT_NODE
    : NT extends 3
      ? MLText<T, O> // TEXT_NODE
      : NT extends 9
        ? MLDocument<T, O> // DOCUMENT_NODE
        : NT extends 10
          ? MLDocumentType<T, O> // DOCUMENT_TYPE_NODE
          : NT extends 11
            ? MLDocumentFragment<T, O> // DOCUMENT_FRAGMENT_NODE
            : NT extends 101
              ? MLBlock<T, O> // MARKUPLINT_PREPROCESSOR_BLOCK
              : NT extends 2
                ? MLAttr<T, O> // ATTRIBUTE_NODE
                : never;
```

### AccessibilityProperties

`MLDocument.getAccessibilityProp()` が返す計算済みアクセシビリティプロパティ：

```typescript
type AccessibilityProperties =
  | {
      unknown: false;
      exposedToTree: boolean;
      role?: string;
      name?: string | { unknown: true };
      nameRequired?: boolean;
      nameProhibited?: boolean;
      focusable?: boolean;
      props?: Record<string, { value: string | null; required: boolean }>;
    }
  | {
      unknown: true;
    };
```

### PretenderContext

pretender システムのコンテキスト：

```typescript
// 別の要素として振る舞う要素
type PretenderContextPretender<N, T, O> = {
  readonly type: 'pretender';
  readonly as: N; // 振る舞い先の仮想 MLElement
  readonly aria?: PretenderARIA;
};

// 元の要素を指す仮想要素
type PretenderContextPretended<N, T, O> = {
  readonly type: 'origin';
  readonly origin: N; // 元の MLElement
};

type PretenderContext<N, T, O> = PretenderContextPretender<N, T, O> | PretenderContextPretended<N, T, O>;
```
