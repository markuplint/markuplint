# MLBlock — プリプロセッサブロックノード

**ソース:** `src/ml-dom/node/block.ts`

## 概要

`MLBlock` はテンプレートエンジンの条件分岐、ループ、その他のプリプロセッサディレクティブを表現する markuplint 固有の DOM ノードです。DOM Standard に対応するものはなく、`nodeType` はカスタム値 `101`（`MARKUPLINT_PREPROCESSOR_BLOCK`）です。

Svelte、Nunjucks、EJS、Pug などのテンプレートエンジンは、HTML コンテンツを非 HTML ブロック（例: `{#if}`、`{#each}`、`{% if %}`）でラップする構文を生成します。パーサーはこれらを `MLASTPreprocessorSpecificBlock` AST ノードに変換し、`MLBlock` がそれをラップします。

MLBlock はテンプレート構文と HTML コンテンツモデル検証の橋渡しをします。条件分岐、イテレーション、その他のフロー制御が、レンダリングされた HTML にどの子ノードが実際に存在するかに影響することを、markuplint が推論できるようにします。

- `nodeName`: `'#ml-block'`
- `nodeType`: `101`（`MARKUPLINT_PREPROCESSOR_BLOCK`）

## プロパティ

| プロパティ        | 型                                              | 説明                                                                                         |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `conditionalType` | `MLASTPreprocessorSpecificBlockConditionalType` | 条件構文の種類（下表参照）、非条件ブロックの場合は `null`                                    |
| `isTransparent`   | `boolean`                                       | ツリー走査で透過的かどうか。現在は常に `true`（ソースの TODO を参照）                        |
| `isFragment`      | `boolean`                                       | ブロックが透過フラグメントとして機能するか（MLNode から継承、`astNode.isFragment` から設定） |

## conditionalType の値

`conditionalType` は、ブロックが条件分岐子ノードパターン生成にどのように参加するかを決定します（後述の[条件分岐子ノード](#条件分岐子ノード)を参照）。

### 条件グループ

認識された `conditionalType` を持つブロックは条件グループを形成します。各グループは「開始」型で始まり、「分岐」型を含む場合があります：

| グループ   | 開始            | 分岐                            | 終了               |
| ---------- | --------------- | ------------------------------- | ------------------ |
| **if**     | `'if'`          | `'if:elseif'`、`'if:else'`      | `'end'` または暗黙 |
| **each**   | `'each'`        | `'each:empty'`                  | `'end'` または暗黙 |
| **switch** | `'switch:case'` | `'switch:default'`              | `'end'` または暗黙 |
| **await**  | `'await'`       | `'await:then'`、`'await:catch'` | `'end'` または暗黙 |

### すべての値

| 値                 | 説明                                                   | 役割                                                           |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------- |
| `'if'`             | 条件ブロックの開始                                     | 新しい条件グループを開始                                       |
| `'if:elseif'`      | 代替条件分岐                                           | 新しい条件グループを開始（パターン生成では `'if'` と同じ扱い） |
| `'if:else'`        | デフォルト（else）分岐                                 | 現在のグループ内の分岐                                         |
| `'switch:case'`    | switch の case 分岐                                    | 新しい条件グループを開始                                       |
| `'switch:default'` | switch のデフォルト分岐                                | 現在のグループ内の分岐                                         |
| `'each'`           | イテレーション（ループ）ブロックの開始                 | 新しい条件グループを開始                                       |
| `'each:empty'`     | イテレーションブロックの空状態                         | 現在のグループ内の分岐                                         |
| `'await'`          | 非同期ブロック（pending 状態）                         | 現在のグループ内の分岐                                         |
| `'await:then'`     | 非同期ブロックの resolved 状態                         | 現在のグループ内の分岐                                         |
| `'await:catch'`    | 非同期ブロックの rejected 状態                         | 現在のグループ内の分岐                                         |
| `'end'`            | ブロック終了マーカー                                   | 無視される（switch の `default` でフィルタされる）             |
| `null`             | 条件セマンティクスなし（例: `{value}` のような式出力） | 条件グループではない。ミュータブルな子として扱われる           |

## 透過性

`MLBlock` は常に透過的です（`isTransparent = true`）。透過性は MLBlock を DOM ツリー走査から見えなくしつつ、親子セマンティクスを保持するコア設計原則です。

### `parentNode` への影響

ノードの構文上の親が透過的な MLBlock の場合、`parentNode` はブロックをスキップし、ブロック自身の `parentNode` を再帰的に返します。つまり、テンプレート構文内のノードは、囲んでいる HTML 要素（ブロックではなく）を親として報告します：

```
ソース:                          parentNode の戻り値:
<ul>                             ─┐
  {#if cond}     (MLBlock)        │  ← スキップされる
    <li>A</li>                    │  → <ul>（MLBlock ではない）
  {/if}                           │
</ul>                            ─┘
```

`MLNode.parentNode` の該当コード：

```typescript
if (parentNode.is(parentNode.MARKUPLINT_PREPROCESSOR_BLOCK)) {
  if (parentNode.isTransparent) {
    return parentNode.parentNode; // 上方に再帰
  }
  return null; // 非透過ブロック: 孤立
}
```

ブロックが非透過（`isTransparent = false`）の場合、子ノードは `parentNode === null`（孤立）を報告します。現在 `isTransparent` は常に `true` なので、この状況は発生しません。

### `childNodes` への影響

ブロックの子ノードは、`getPureChildNodes()` と `childNodes` の展開パイプラインを通じて親の `childNodes` にインライン化されます：

1. **`getPureChildNodes()`**: `MARKUPLINT_PREPROCESSOR_BLOCK` に対して `ELEMENT_NODE` や `DOCUMENT_FRAGMENT_NODE` と同様に動作します — `astNode.childNodes` を読み取り、`endtag` と `invalid` ノードをフィルタし、MLDOM ノードにマッピングします
2. **`childNodes`**（親側）: `getPureChildNodes()` を呼び出し、`isFragment === true` の子については、その `childNodes` を再帰的にインライン化します

```
ソース:                          <ul>.childNodes の戻り値:
<ul>                             ─┐
  {#if cond}                      │  ← MLBlock は childNodes に含まれない
    <li>A</li>                    │  → [<li>A</li>, <li>B</li>]
    <li>B</li>                    │
  {/if}                           │
</ul>                            ─┘
```

これにより、親子関係を検証するルール（`permitted-contents` など）が、テンプレートエンジンのラッパーではなく、実効的な HTML の子ノードを確認できます。

### `syntacticalParentNode` と `parentNode` の比較

| プロパティ              | 動作                              | 用途                                    |
| ----------------------- | --------------------------------- | --------------------------------------- |
| `syntacticalParentNode` | MLBlock を含む直接の AST 親を返す | パースされた生の構造の理解              |
| `parentNode`            | 透過的な MLBlock ノードをスキップ | リントルール用の DOM ライクなツリー走査 |

## 条件分岐子ノード

`MLNode` の `conditionalChildNodes()` メソッドは、MLBlock の `conditionalType` を使用して、レンダリングされた出力に現れうるすべての子ノードパターンを列挙します。これはテンプレート分岐がある場合のコンテンツモデル検証に不可欠です。

### アルゴリズム

1. 現在のノードの `childNodes` を走査する
2. 認識された `conditionalType` を持つ各 MLBlock 子に対して：
   - `mode` を判定（`'if'`、`'each'`、または `'switch'`）
   - ブロックに対して再帰的に `conditionalChildNodes()` を呼び出してサブパターンを取得
   - すべての分岐の代替を `subBranches` 配列に収集
3. 条件グループ終了後に非ブロックの子が出現したとき：
   - mode が `'if'`、`'each'`、または `'switch'` の場合：`null` をセンチネルとしてプッシュ（どの分岐もレンダリングされない「空」ケースを表現）
   - 現在のグループを閉じ、`subBranches` を `branches` にプッシュ
4. 空白のみのテキストノードはスキップ
5. 非ブロックの子は直接 `branches` に追加
6. `branches` を `branchesToPatterns()` に渡してデカルト積を計算

### `branchesToPatterns()`

このユーティリティ関数（`@markuplint/shared` から）は分岐の代替のデカルト積を計算します：

- 通常の要素（非配列）はすべてのパターンに出現する
- 配列の要素は代替を表す — 各要素が別のパターンを生成する
- `null` 値はフィルタされる（空の分岐を表現）

```
入力:  [A, [B, C], D]
出力: [[A, B, D], [A, C, D]]

入力:  [A, [B, null], C]
出力: [[A, B, C], [A, C]]    ← null はフィルタ = 「分岐がレンダリングされない」
```

### 例

以下の Svelte テンプレートの場合：

```svelte
<ul>
  {#if cond}
    <li>A</li>
  {:else}
    <li>B</li>
  {/if}
  <li>C</li>
</ul>
```

AST 構造：

```
MLElement <ul>
  ├── MLBlock (conditionalType: 'if')
  │     └── MLElement <li>A</li>
  ├── MLBlock (conditionalType: 'if:else')
  │     └── MLElement <li>B</li>
  └── MLElement <li>C</li>
```

`<ul>` に対する `conditionalChildNodes()` の結果：

```
branches = [[<li>A</li>, <li>B</li>, null], <li>C</li>]
                  ↓ branchesToPatterns()
パターン 1: [<li>A</li>, <li>C</li>]   ← if 分岐
パターン 2: [<li>B</li>, <li>C</li>]   ← else 分岐
パターン 3: [<li>C</li>]               ← 分岐なし（null はフィルタ）
```

`null` センチネルは、条件グループ（if/else）が何もレンダリングしない可能性があるため追加されます（例: パーサーが分岐が常に実行されるかどうかを判定できない場合）。`permitted-contents` ルールはすべてのパターンを検証し、すべてのケースでコンテンツモデルが満たされることを保証します。

### ネストされた条件分岐

アルゴリズムは再帰的な `conditionalChildNodes()` 呼び出しによって自然にネストを処理します：

```svelte
<div>
  {#if a}
    {#if b}
      <span>X</span>
    {:else}
      <span>Y</span>
    {/if}
  {:else}
    <span>Z</span>
  {/if}
</div>
```

内側の `{#if b}` ブロックは再帰的にパターン `[<span>X</span>]`、`[<span>Y</span>]` を生成し、外側のブロックの `subBranches` に展開されます。

## `hasMutableChildren()` との相互作用

`MLElement.hasMutableChildren()` は `conditionalType` を使用して MLBlock を2つのカテゴリに区別します：

- **`conditionalType` を持つブロック**（例: `'if'`、`'each'`、`'switch:case'`）：スキップ（`continue`）— `conditionalChildNodes()` がすべての可能なパターンを列挙して処理する
- **`conditionalType` を持たないブロック**（`null`）：即座に `true` を返す — `{value}` のような式出力やその他の非条件テンプレート構文を表し、内容が静的に決定できない

```typescript
for (const child of this.getPureChildNodes()) {
  if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
    if (child.conditionalType) {
      continue; // 条件セマンティクスあり → 別の場所で処理
    }
    return true; // 条件セマンティクスなし → 本当にミュータブル
  }
  // ...
}
```

この区別は重要です：`{#if}` ブロックは決定論的な分岐パターンを生成しますが、`{variable}` ブロックは任意のコンテンツを生成する可能性があります。`permitted-contents` のようなルールは前者を検証できますが、後者はスキップしなければなりません。

## リンティングパイプラインでの役割

MLBlock はリンティングパイプラインの複数のレベルで参加します：

### 1. パースフェーズ

テンプレートエンジンパーサー（Svelte、Nunjucks、EJS、Pug など）が `MLASTPreprocessorSpecificBlock` AST ノードを生成します。各パーサーは以下を担当します：

- `conditionalType` の適切な設定（例: Svelte `{#if}` → `'if'`、`{#each}` → `'each'`）
- ブロック内への子 AST ノードのネスト
- フラグメントコンテナとして機能すべきブロックの `isFragment` 設定

### 2. MLDOM 構築

`createNode()` は `'psblock'` AST タイプを `MLBlock` にマッピングします。ブロックは要素、テキストノード、コメントと並んでドキュメントの `nodeList` に含まれます。

### 3. ツリー走査

透過性により、MLBlock は標準的な DOM 走査から見えなくなります：

- `parentNode` は透過ブロックをスキップする
- `childNodes` はブロックの子を親にインライン化する
- `walkOn('Element', ...)` は MLBlock ノードに遭遇しない（要素、テキスト、コメント、属性、閉じタグのみを走査）

### 4. コンテンツモデル検証

`permitted-contents` ルールは `conditionalChildNodes()` を使用してすべての可能なコンテンツパターンを検証します：

```typescript
const childNodesPatterns = options.evaluateConditionalChildNodes
  ? el.conditionalChildNodes().map(childNodes => [...childNodes])
  : [[...el.childNodes].filter(/* ... */)];
```

各パターンは HTML コンテンツモデル仕様に対して独立に検証されます。

## メソッド

MLBlock は DOM API 互換性のために `ChildNode` インターフェースメソッドを実装しています：

| メソッド      | シグネチャ                                       | 説明                           |
| ------------- | ------------------------------------------------ | ------------------------------ |
| `after`       | `after(...nodes: (string \| MLElement)[])`       | このブロックの後にノードを挿入 |
| `before`      | `before(...nodes: (string \| MLElement)[])`      | このブロックの前にノードを挿入 |
| `remove`      | `remove()`                                       | 親からこのブロックを削除       |
| `replaceWith` | `replaceWith(...nodes: (string \| MLElement)[])` | このブロックを他のノードで置換 |

これらのメソッドは `src/ml-dom/manipulations/child-node-methods.ts` の共有実装に委譲します。
