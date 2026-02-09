# ノードリファレンス

`@markuplint/ml-ast` で定義されている全 AST ノード型の詳細リファレンスです。

## 概要

すべての AST ノードは `type` フィールドに基づく**判別共用体（discriminated union）**パターンを使用しています。TypeScript の `switch` 文で網羅的な型の絞り込みが可能です：

```typescript
import type { MLASTNode } from '@markuplint/ml-ast';

function handle(node: MLASTNode) {
  switch (node.type) {
    case 'doctype':
      /* node は MLASTDoctype */ break;
    case 'starttag':
      /* node は MLASTElement */ break;
    case 'endtag':
      /* node は MLASTElementCloseTag */ break;
    case 'comment':
      /* node は MLASTComment */ break;
    case 'text':
      /* node は MLASTText */ break;
    case 'psblock':
      /* node は MLASTPreprocessorSpecificBlock */ break;
    case 'invalid':
      /* node は MLASTInvalid */ break;
    case 'attr':
      /* node は MLASTHTMLAttr */ break;
    case 'spread':
      /* node は MLASTSpreadAttr */ break;
  }
}
```

## AST から MLDOM へのマッピング

このパッケージで定義されたすべての AST ノードは、最終的に `@markuplint/ml-core` によって **MLDOM** ノードに変換されます。MLDOM は markuplint の DOM 実装であり、**[DOM Standard](https://dom.spec.whatwg.org/) に準拠**しています。各 MLDOM クラスは対応する DOM インターフェース（`Node`、`Element`、`DocumentType`、`Comment`、`Text` など）を実装しており、リントルールは標準 DOM API を使って検査できます。

マッピングは `ml-core` の `createNode()` で実行されます：

| AST 型（`ml-ast`）                   | MLDOM クラス（`ml-core`）  | 実装する DOM インターフェース | `nodeType` |
| ------------------------------------ | -------------------------- | ----------------------------- | ---------- |
| `MLASTDoctype`                       | `MLDocumentType`           | `DocumentType`                | `10`       |
| `MLASTElement`                       | `MLElement`                | `Element`, `HTMLElement`      | `1`        |
| `MLASTComment`                       | `MLComment`                | `Comment`                     | `8`        |
| `MLASTText`                          | `MLText`                   | `Text`                        | `3`        |
| `MLASTPreprocessorSpecificBlock`     | `MLBlock`                  | _（markuplint 独自）_         | `101`      |
| `MLASTInvalid`（`kind: 'starttag'`） | `MLElement`（`x-invalid`） | `Element`, `HTMLElement`      | `1`        |
| `MLASTInvalid`（その他）             | `MLText`                   | `Text`                        | `3`        |

### 特殊なノード

- **`MLASTElementCloseTag`** は `createNode()` を**経由しません**。代わりに `MLElement` が内部で `pairNode` 参照から `MLElementCloseTag` を生成します。`MLElementCloseTag` は DOM ツリー走査の対象ではなく、ペアとなる要素の付属物としてのみ存在します。
- **`MLASTPreprocessorSpecificBlock`** は `MLBlock` にマッピングされます。これは DOM Standard に相当するものがない **markuplint 独自の拡張**です。DOM Standard の範囲外であるカスタム `nodeType` `101` を使用します。`MLBlock` は透過的であり、子ノードはツリー走査時に親ノードに属するものとして扱われます。
- **`MLASTHTMLAttr`** と **`MLASTSpreadAttr`** は `MLAttr` にマッピングされ、DOM `Attr` インターフェース（`nodeType: 2`）を実装します。属性は `createNode()` を経由せず、`MLElement.attributes`（`MLNamedNodeMap`）を通じてアクセスされます。

## 基底型

### MLASTToken

すべての位置情報の基盤となるインターフェースです。すべての AST ノードとサブトークンがこれを継承します。

| フィールド    | 型       | 説明                                       |
| ------------- | -------- | ------------------------------------------ |
| `uuid`        | `string` | このトークンインスタンスの一意識別子       |
| `raw`         | `string` | 元のソーステキスト                         |
| `startOffset` | `number` | トークン開始位置のゼロベース文字オフセット |
| `endOffset`   | `number` | トークン終了位置のゼロベース文字オフセット |
| `startLine`   | `number` | トークン開始位置の1ベース行番号            |
| `endLine`     | `number` | トークン終了位置の1ベース行番号            |
| `startCol`    | `number` | トークン開始位置の1ベース列番号            |
| `endCol`      | `number` | トークン終了位置の1ベース列番号            |

**座標系について：** オフセットはゼロベース（0から数える）、行と列は1ベース（1から数える）です。これはほとんどのテキストエディタやエラーレポーターの慣例に一致しています。

### MLASTAbstractNode

`MLASTToken` を継承し構造的メタデータを追加する内部（非エクスポート）基底インターフェースです。すべての具象ノード型がこれを継承します。

| フィールド   | 型                        | 説明                                          |
| ------------ | ------------------------- | --------------------------------------------- |
| `type`       | `MLASTNodeType`           | 具象ノード種別を識別する判別タグ              |
| `nodeName`   | `string`                  | ノード名（タグ名、`#text`、`#comment` など）  |
| `parentNode` | `MLASTParentNode \| null` | 親ノードへの参照、トップレベルの場合は `null` |

## MLASTDocument

**役割：** すべてのパーサーが返すルートコンテナです。AST ツリー内のノードではなく、パース結果を保持するラッパーです。

| フィールド          | 型                             | 説明                                                    |
| ------------------- | ------------------------------ | ------------------------------------------------------- |
| `raw`               | `string`                       | 元のソースコード全体                                    |
| `nodeList`          | `readonly MLASTNodeTreeItem[]` | ドキュメント順のトップレベル AST ノードのフラットリスト |
| `isFragment`        | `boolean`                      | フラグメントかどうか（ルート要素不要）                  |
| `unknownParseError` | `string \| undefined`          | 未知のパースエラーの説明                                |

**重要：** `nodeList` はツリーではなく**フラットリスト**です。子ノードは各要素の `childNodes` プロパティからアクセスできます。リストはドキュメント順（ソース内の出現順）でノードを含みます。

## MLASTDoctype

**type 判別子：** `'doctype'`

**役割：** DOCTYPE 宣言（例：`<!DOCTYPE html>`）を表します。常にドキュメントのトップレベルに出現します。

| フィールド | 型          | 説明                                           |
| ---------- | ----------- | ---------------------------------------------- |
| `type`     | `'doctype'` | 判別タグ                                       |
| `depth`    | `number`    | ネストの深さ（DOCTYPE では常に 0）             |
| `name`     | `string`    | 宣言されたドキュメントタイプ名（例：`"html"`） |
| `publicId` | `string`    | DOCTYPE のパブリック識別子（ある場合）         |
| `systemId` | `string`    | DOCTYPE のシステム識別子（ある場合）           |

**例：**

```html
<!DOCTYPE html>
```

`name: "html"`、`publicId: ""`、`systemId: ""` のノードが生成されます。

## MLASTElement

**type 判別子：** `'starttag'`

**役割：** 開始タグ（例：`<div class="foo">`）を表します。AST における主要な要素表現であり、最も機能豊富なノード型です。子ノード、属性を所有し、対応する閉じタグへの参照を保持します。

| フィールド           | 型                             | 説明                                                             |
| -------------------- | ------------------------------ | ---------------------------------------------------------------- |
| `type`               | `'starttag'`                   | 判別タグ                                                         |
| `depth`              | `number`                       | ドキュメントツリーでのネストの深さ                               |
| `namespace`          | `string`                       | 名前空間 URI（例：`"http://www.w3.org/1999/xhtml"`）             |
| `elementType`        | `ElementType`                  | `'html'`、`'web-component'`、`'authored'` のいずれか             |
| `isFragment`         | `boolean`                      | フラグメントとして機能するか（例：React `<>`、Vue `<template>`） |
| `attributes`         | `readonly MLASTAttr[]`         | この要素の属性                                                   |
| `hasSpreadAttr`      | `boolean \| undefined`         | スプレッド属性を持つかどうか                                     |
| `childNodes`         | `readonly MLASTChildNode[]`    | この要素の直接の子ノード                                         |
| `pairNode`           | `MLASTElementCloseTag \| null` | 対応する閉じタグ、void/自己閉じ要素の場合は `null`               |
| `selfClosingSolidus` | `MLASTToken \| undefined`      | 自己閉じスラッシュトークン（`/`）（例：`<br />`）                |
| `tagOpenChar`        | `string`                       | タグを開く文字（通常 `"<"`）                                     |
| `tagCloseChar`       | `string`                       | タグを閉じる文字（通常 `">"`）                                   |
| `isGhost`            | `boolean`                      | ゴーストノード（パーサーが推定した省略タグ）かどうか             |

### 要素タイプの分類

`elementType` フィールドは要素を3つのカテゴリに分類します：

| 値                | 説明                                                     | 例                       |
| ----------------- | -------------------------------------------------------- | ------------------------ |
| `'html'`          | HTML Standard に基づくネイティブ HTML 要素               | `<div>`, `<span>`, `<p>` |
| `'web-component'` | HTML Standard に準拠する Web Component（ハイフン含む）   | `<my-component>`         |
| `'authored'`      | ビューフレームワークやテンプレートエンジンの著者定義要素 | `<MyComponent>`（JSX）   |

### タグデリミタ

`tagOpenChar` と `tagCloseChar` はタグを区切る実際の文字を表します。標準 HTML では `"<"` と `">"` ですが、テンプレートエンジンは異なるデリミタを使用する場合があります。

### ゴーストノード（省略タグ）

`isGhost` が `true` の場合、その要素はソースに明示的に記述されておらず、パーサーによって推定されたものです。HTML では特定のタグが省略可能です（例：`<table>` 内の `<tbody>`）。ゴーストノードの `raw` は空文字列です。

### ペアノードの関係

`pairNode` フィールドは開始タグと閉じタグの間に**双方向リンク**を作成します：

- `MLASTElement.pairNode` は対応する `MLASTElementCloseTag` を指す
- `MLASTElementCloseTag.pairNode` は対応する `MLASTElement` を指す

void 要素（`<br>`、`<img>` など）と自己閉じ要素の場合、`pairNode` は `null` です。

### フラグメント要素

`isFragment` が `true` の場合、その要素は実際の DOM ノードを持たない透過的なラッパーとして機能します。React フラグメント（`<>...</>`）や Vue の `<template>` ラッパーなどのフレームワーク固有の構文に使用されます。

**例：**

```html
<div class="container" id="main">
  <p>Hello</p>
</div>
```

`<div>` は以下の `MLASTElement` を生成します：

- `nodeName: "div"`
- `elementType: "html"`
- `namespace: "http://www.w3.org/1999/xhtml"`
- `attributes`：`class` と `id` 属性を含む配列
- `childNodes`：`<p>` 要素とテキストノードを含む配列
- `pairNode`：`</div>` 閉じタグへの参照

## MLASTElementCloseTag

**type 判別子：** `'endtag'`

**役割：** 閉じタグ（例：`</div>`）を表します。`pairNode` フィールドを通じて常に `MLASTElement` とペアになります。

| フィールド     | 型             | 説明                               |
| -------------- | -------------- | ---------------------------------- |
| `type`         | `'endtag'`     | 判別タグ                           |
| `depth`        | `number`       | ドキュメントツリーでのネストの深さ |
| `parentNode`   | `null`         | 閉じタグでは常に `null`            |
| `pairNode`     | `MLASTElement` | 対応する開始タグ                   |
| `tagOpenChar`  | `string`       | タグを開く文字（通常 `"</"`）      |
| `tagCloseChar` | `string`       | タグを閉じる文字（通常 `">"`）     |

**`parentNode` が常に `null` である理由：** AST モデルでは、開始タグ（`MLASTElement`）のみが親子ツリー構造に参加します。閉じタグは `pairNode` を通じて開始タグにリンクされた別のノードとして存在しますが、どの親ノードの子でもありません。これによりツリー内での要素の重複を避けています。

## MLASTComment

**type 判別子：** `'comment'`

**役割：** HTML コメント（例：`<!-- ... -->`）を表します。

| フィールド | 型           | 説明                               |
| ---------- | ------------ | ---------------------------------- |
| `type`     | `'comment'`  | 判別タグ                           |
| `nodeName` | `'#comment'` | 常に `'#comment'`                  |
| `depth`    | `number`     | ドキュメントツリーでのネストの深さ |
| `isBogus`  | `boolean`    | ボーガス（不正形式）かどうか       |

### ボーガスコメント

`isBogus` が `true` の場合、そのコメントは HTML 仕様に従って不正形式です。ボーガスコメントの例：

- `<!...>`（有効な DOCTYPE でもコメントでもない）
- `<?xml version="1.0"?>`（HTML における処理命令）

パーサーはこれらをコメントノードとしてキャプチャしますが、リントルールが報告できるようにボーガスとしてフラグを立てます。

## MLASTText

**type 判別子：** `'text'`

**役割：** 要素間の文字データを表します。

| フィールド | 型        | 説明                               |
| ---------- | --------- | ---------------------------------- |
| `type`     | `'text'`  | 判別タグ                           |
| `nodeName` | `'#text'` | 常に `'#text'`                     |
| `depth`    | `number`  | ドキュメントツリーでのネストの深さ |

`raw` フィールド（`MLASTToken` から継承）にはホワイトスペースを**含む**完全なテキスト内容が格納されます。2つの要素間のテキストノードは、完全にホワイトスペース（改行、インデントなど）で構成される場合があります。

**例：**

```html
<p>Hello, world!</p>
```

テキスト `Hello, world!` は `raw: "Hello, world!"` の `MLASTText` ノードとして表現されます。

## MLASTPreprocessorSpecificBlock

**type 判別子：** `'psblock'`

**役割：** テンプレートエンジンやフレームワークの制御フロー・反復構文を表します。標準 HTML には存在しないが、Svelte、Vue、EJS、ERB などのプリプロセッサで使用される構文です。

| フィールド        | 型                                              | 説明                                     |
| ----------------- | ----------------------------------------------- | ---------------------------------------- |
| `type`            | `'psblock'`                                     | 判別タグ                                 |
| `conditionalType` | `MLASTPreprocessorSpecificBlockConditionalType` | 条件分岐・反復構文の種別                 |
| `depth`           | `number`                                        | ドキュメントツリーでのネストの深さ       |
| `nodeName`        | `string`                                        | パーサーが決定したブロック名             |
| `isFragment`      | `boolean`                                       | 透過的なフラグメントとして機能するか     |
| `childNodes`      | `readonly MLASTChildNode[]`                     | このブロック内の直接の子ノード           |
| `isBogus`         | `boolean`                                       | ボーガス（パース不能・不正形式）かどうか |

### conditionalType の値

`conditionalType` フィールドはブロックの意味的な役割を示します：

| 値                 | 説明                         | 例（Svelte）            | 例（EJS/ERB）       |
| ------------------ | ---------------------------- | ----------------------- | ------------------- |
| `'if'`             | 条件分岐（開始）             | `{#if condition}`       | `<% if (x) { %>`    |
| `'if:elseif'`      | 代替条件分岐                 | `{:else if condition}`  | `<% } else if { %>` |
| `'if:else'`        | デフォルト（else）分岐       | `{:else}`               | `<% } else { %>`    |
| `'switch:case'`    | switch case 分岐             | --                      | --                  |
| `'switch:default'` | switch default 分岐          | --                      | --                  |
| `'each'`           | 反復（ループ）ブロック       | `{#each items as item}` | `<% for (...) { %>` |
| `'each:empty'`     | 反復ブロックの空状態         | `{:else}`（`#each` 内） | --                  |
| `'await'`          | 非同期ブロック（保留状態）   | `{#await promise}`      | --                  |
| `'await:then'`     | 非同期ブロックの解決状態     | `{:then value}`         | --                  |
| `'await:catch'`    | 非同期ブロックの拒否状態     | `{:catch error}`        | --                  |
| `'end'`            | 閉じブロック                 | `{/if}`, `{/each}`      | `<% } %>`           |
| `null`             | 特定の条件セマンティクスなし | --                      | `<%= expr %>`       |

### フレームワーク固有の例

**Svelte：**

```svelte
{#if loggedIn}
  <p>Welcome!</p>
{:else}
  <p>Please log in.</p>
{/if}
```

3つの `psblock` ノードが生成されます：

1. `conditionalType: 'if'`：`{#if loggedIn}`
2. `conditionalType: 'if:else'`：`{:else}`
3. `conditionalType: 'end'`：`{/if}`

**Vue（v-if ディレクティブは異なる方法で処理されます -- psblock ではなく要素属性経由）。**

**EJS：**

```ejs
<% if (user) { %>
  <p><%= user.name %></p>
<% } %>
```

生成されるノード：

1. `conditionalType: 'if'`：`<% if (user) { %>`
2. `conditionalType: 'end'`：`<% } %>`
3. `conditionalType: null`：`<%= user.name %>`（式出力、条件セマンティクスなし）

## MLASTInvalid

**type 判別子：** `'invalid'`

**役割：** 正しくパースできなかったマークアップを表します。パーサーはパース不能なコンテンツを完全に失敗するのではなく、invalid ノードとしてキャプチャし、リントルールが問題を報告できるようにします。

| フィールド | 型                                                        | 説明                               |
| ---------- | --------------------------------------------------------- | ---------------------------------- |
| `type`     | `'invalid'`                                               | 判別タグ                           |
| `nodeName` | `'#invalid'`                                              | 常に `'#invalid'`                  |
| `depth`    | `number`                                                  | ドキュメントツリーでのネストの深さ |
| `kind`     | `Exclude<MLASTChildNode['type'], 'invalid'> \| undefined` | 本来意図されていたノードの種類     |
| `isBogus`  | `true`                                                    | invalid ノードでは常に `true`      |

### `kind` フィールドと ml-core での変換

`kind` フィールドは、パーサーが不正なコンテンツが本来何であるべきだと考えるかを記録します。この情報は `ml-core` が AST を DOM ツリーに変換する際に使用されます：

| `kind` の値          | ml-core での変換                                                              |
| -------------------- | ----------------------------------------------------------------------------- |
| `'starttag'`         | `nodeName: 'x-invalid'`、`elementType: 'web-component'` の `MLElement` に変換 |
| その他 / `undefined` | `nodeName: '#text'` の `MLText` ノードに変換                                  |

この変換により、リントルールは不正なコンテンツに対しても動作でき、パーサーの推測に応じて要素またはテキストとして扱います。

## MLASTHTMLAttr

**type 判別子：** `'attr'`

**役割：** 通常の HTML 属性を表し、構成トークンに完全に分解されます。この粒度の高い分解により、リントルールは属性の個々の部分（ホワイトスペース、引用符スタイル、名前、値）を検査・検証できます。

| フィールド          | 型                                                         | 説明                                                         |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `type`              | `'attr'`                                                   | 判別タグ                                                     |
| `nodeName`          | `string`                                                   | 文字列としての属性名                                         |
| `spacesBeforeName`  | `MLASTToken`                                               | 属性名の前のホワイトスペーストークン                         |
| `name`              | `MLASTToken`                                               | 属性名トークン                                               |
| `spacesBeforeEqual` | `MLASTToken`                                               | 名前と等号の間のホワイトスペーストークン                     |
| `equal`             | `MLASTToken`                                               | 等号トークン                                                 |
| `spacesAfterEqual`  | `MLASTToken`                                               | 等号と値の間のホワイトスペーストークン                       |
| `startQuote`        | `MLASTToken`                                               | 開始引用符トークン                                           |
| `value`             | `MLASTToken`                                               | 属性値トークン                                               |
| `endQuote`          | `MLASTToken`                                               | 終了引用符トークン                                           |
| `isDynamicValue`    | `true \| undefined`                                        | 値が動的式かどうか（例：フレームワークバインディング）       |
| `isDirective`       | `true \| undefined`                                        | フレームワークディレクティブかどうか（例：`v-if`、`@click`） |
| `potentialName`     | `string \| undefined`                                      | 実際の名前がディレクティブの場合の解決済み属性名             |
| `potentialValue`    | `string \| undefined`                                      | 実際の値が動的な場合の解決済み属性値                         |
| `valueType`         | `'string' \| 'number' \| 'boolean' \| 'code' \| undefined` | 属性値のセマンティックな型                                   |
| `candidate`         | `string \| undefined`                                      | 自動修正用の候補属性名                                       |
| `isDuplicatable`    | `boolean`                                                  | この属性が同一要素上に複数回出現可能かどうか                 |

### 属性の分解

属性は個別のトークンに分解され、それぞれが独自の位置情報を持ちます：

```
 ·class="container"
 ↑     ↑↑         ↑
 │     ││         └─ endQuote (raw: '"')
 │     │└─ value (raw: 'container')
 │     └─ startQuote (raw: '"')
 │        equal (raw: '=')
 │        spacesBeforeEqual (raw: '')
 │        spacesAfterEqual (raw: '')
 └─ spacesBeforeName (raw: ' ')
    name (raw: 'class')
```

値のないブール属性（例：`disabled`）の場合、`equal`、`startQuote`、`value`、`endQuote` トークンは存在しますが、`raw` は空文字列です。

### フレームワーク拡張フィールド

これらのフィールドはフレームワーク固有のパーサーによって設定されます：

- **`isDynamicValue`**：属性値が動的式の場合 `true`。例えば Vue の `<div :class="expr">` では、値 `expr` は動的です。
- **`isDirective`**：属性がフレームワークディレクティブの場合 `true`。例：Vue の `v-if`、`v-for`、`@click`、Svelte の `on:click`。
- **`potentialName`**：解決された標準属性名。例：`:class` は `class` に解決、`@click` は `onclick` に解決。
- **`potentialValue`**：動的式が静的に解析可能な場合の解決された属性値。
- **`valueType`**：値のセマンティックな型 -- `'string'`、`'number'`、`'boolean'`、`'code'`（式）。
- **`candidate`**：属性名の修正候補。自動修正ルールで使用。
- **`isDuplicatable`**：同一要素上で属性が複数回出現可能な場合 `true`（例：値をマージするテンプレートエンジンでの `class`）。

## MLASTSpreadAttr

**type 判別子：** `'spread'`

**役割：** スプレッド属性（例：JSX の `{...props}`）を表します。スプレッド属性は静的に分解できないため、最小限のノード型です。

| フィールド | 型          | 説明             |
| ---------- | ----------- | ---------------- |
| `type`     | `'spread'`  | 判別タグ         |
| `nodeName` | `'#spread'` | 常に `'#spread'` |

`MLASTSpreadAttr` は `MLASTAbstractNode` ではなく `MLASTToken` を直接継承するため、位置情報（`uuid`、`raw`、`startOffset` など）はありますが、`parentNode` や `depth` はありません。

## 共用体型リファレンス

| 共用体型            | メンバー                                                                                                               | 用途                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `MLASTNode`         | `MLASTDoctype \| MLASTTag \| MLASTComment \| MLASTText \| MLASTPreprocessorSpecificBlock \| MLASTInvalid \| MLASTAttr` | すべての AST ノード型                           |
| `MLASTParentNode`   | `MLASTElement \| MLASTPreprocessorSpecificBlock`                                                                       | 子ノードを含むことができるノード                |
| `MLASTChildNode`    | `MLASTTag \| MLASTText \| MLASTComment \| MLASTPreprocessorSpecificBlock \| MLASTInvalid`                              | 子として出現できるノード                        |
| `MLASTNodeTreeItem` | `MLASTChildNode \| MLASTDoctype`                                                                                       | `MLASTDocument.nodeList` のトップレベルアイテム |
| `MLASTTag`          | `MLASTElement \| MLASTElementCloseTag`                                                                                 | タグノード（開始または終了）                    |
| `MLASTAttr`         | `MLASTHTMLAttr \| MLASTSpreadAttr`                                                                                     | 属性ノード                                      |

## 型の絞り込みパターン

### `type` による絞り込み

最も一般的なパターン -- `switch` 文で網羅的に絞り込みます：

```typescript
import type { MLASTChildNode } from '@markuplint/ml-ast';

function processChild(node: MLASTChildNode) {
  switch (node.type) {
    case 'starttag':
      console.log(`要素: <${node.nodeName}>, 属性数: ${node.attributes.length}`);
      break;
    case 'endtag':
      console.log(`閉じタグ: </${node.nodeName}>`);
      break;
    case 'text':
      console.log(`テキスト: "${node.raw}"`);
      break;
    case 'comment':
      console.log(`コメント (bogus: ${node.isBogus})`);
      break;
    case 'psblock':
      console.log(`ブロック: ${node.nodeName}, conditional: ${node.conditionalType}`);
      break;
    case 'invalid':
      console.log(`不正: kind=${node.kind}`);
      break;
  }
}
```

### 親ノードの判定

```typescript
import type { MLASTNode, MLASTParentNode } from '@markuplint/ml-ast';

function isParent(node: MLASTNode): node is MLASTParentNode {
  return node.type === 'starttag' || node.type === 'psblock';
}
```

### 属性型の判別

```typescript
import type { MLASTAttr } from '@markuplint/ml-ast';

function processAttr(attr: MLASTAttr) {
  if (attr.type === 'attr') {
    // MLASTHTMLAttr -- name, value, quotes などを持つ
    console.log(`${attr.name.raw}="${attr.value.raw}"`);
  } else {
    // MLASTSpreadAttr -- raw と位置情報のみ
    console.log(`スプレッド: ${attr.raw}`);
  }
}
```
