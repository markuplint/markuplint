# MLElement

**ソース:** `src/ml-dom/node/element.ts`

HTML/SVG/MathML の要素ノードです。`MLParentNode` を継承し、`Element`、`HTMLElement`、`HTMLOrSVGElement` を実装します。MLDOM 階層の中で最も多機能なクラスです。

## 名前プロパティ

要素には異なる目的に使用される複数の名前関連プロパティがあります：

| プロパティ      | HTML `<DIV>`                | SVG `<foreignObject>` | Pretender（`MyButton` → `button`） |
| --------------- | --------------------------- | --------------------- | ---------------------------------- |
| `localName`     | `"div"`                     | `"foreignObject"`     | `"button"`                         |
| `nodeName`      | `"DIV"`                     | `"foreignObject"`     | `"BUTTON"`                         |
| `rawName`       | `"DIV"`                     | `"foreignObject"`     | `"MyButton"`                       |
| `fixedNodeName` | `"DIV"`（修正後は `"div"`） | `"foreignObject"`     | `"MyButton"`                       |
| `tagName`       | `"DIV"`                     | `"foreignObject"`     | `"BUTTON"`                         |

**ルール：**

- **`localName`**: HTML 要素 → 小文字化。外部要素または非 `'html'` の elementType → そのまま。pretender コンテキスト → pretender の `localName`。`tagNameCaseSensitive` が `true` の場合 → 小文字化しない。
- **`nodeName`**: HTML 要素 → 大文字化（DOM 慣例）。外部要素または非 `'html'` の elementType → AST からそのまま。pretender コンテキスト → pretender の `nodeName`。
- **`rawName`**: 常に元の AST `nodeName`。正規化なし、pretender の影響なし。
- **`fixedNodeName`**: 初期値は `rawName`。リント修正がタグ名を変更した場合に `fixNodeName(name)` で更新される。
- **`tagName`**: `nodeName` と同じ（pretender コンテキストに従う）。

## 要素型の判定

| `elementType`     | 条件                                                           | 例                          |
| ----------------- | -------------------------------------------------------------- | --------------------------- |
| `'html'`          | 標準 HTML 要素（HTML 名前空間の既知のタグ名）                  | `<div>`、`<span>`、`<p>`    |
| `'web-component'` | タグ名にハイフンを含む（Custom Element 慣例）                  | `<my-component>`、`<x-app>` |
| `'authored'`      | ハイフンを含まない非標準タグ名（フレームワークコンポーネント） | `<MyComponent>`（JSX）      |

`elementType` はパーサーが AST 作成時に決定し、`astNode.elementType` として格納されます。

## 属性アクセス

### `attributes`（MLNamedNodeMap）

`attributes` ゲッターは重複排除された `MLNamedNodeMap` を返します：

1. 属性ソースを選択する：pretender コンテキスト（`type === 'pretender'`）の場合、pretender 要素の属性を使用する。それ以外の場合は元の属性を使用する
2. 名前で重複排除する：属性を反復し、各名前の最初の出現のみを保持する（[HTML パースエラー: duplicate-attribute](https://html.spec.whatwg.org/#parse-error-duplicate-attribute) 仕様に従う）
3. `MLNamedNodeMap` でラップし、結果をキャッシュする

### 属性メソッド

| メソッド                | シグネチャ                                            | 説明                                                                      |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `getAttribute`          | `getAttribute(name: string): string \| null`          | 大文字小文字を区別しない名前検索で、最初にマッチした属性の `value` を返す |
| `getAttributeToken`     | `getAttributeToken(name: string): MLAttr[]`           | 名前にマッチする**すべての** `MLAttr` トークンを返す（重複属性に対応）    |
| `getAttributeTokens`    | `getAttributeTokens(): ReadonlyArray<MLAttr>`         | すべての属性トークン（pretender コンテキスト → pretender の属性）         |
| `getAttributePretended` | `getAttributePretended(name: string): string \| null` | pretender コンテキストを**無視**して**元の**要素から属性値を取得する      |
| `hasAttribute`          | `hasAttribute(name: string): boolean`                 | 大文字小文字を区別しない存在チェック（`getAttribute` に委譲）             |

### `hasMutableAttributes()`

属性が非決定的な場合に `true` を返します：

- `nameNode` を持たない属性がある（つまり `{...props}` のようなスプレッド属性）
- `isDynamicValue === true` の属性がある（例：テンプレート式）

ルールはこれを使って、属性セットが静的解析時に完全には分からないことを検出します。

## セレクタマッチング

### `matches(selector, scope?)`

`boolean` を返します。`matchMLSelector()` に委譲し、`matched` をチェックします。

### `matchMLSelector(selector, scope?)`

CSS セレクタ文字列と `RegexSelector` オブジェクトの両方をサポートする拡張セレクタマッチングです。`SelectorMatches`（詳細度と正規表現キャプチャデータを含むマッチ結果）を返します。

**pretender 要素の2段階マッチング：**

1. 要素が pretender コンテキスト（`type === 'pretender'`）を持つ場合：
   - まず **pretender として**マッチングする（例：`<button>` として）
   - pretender がマッチした場合 → 結果を返す
2. pretender がマッチしなかった場合：
   - 一時的に `pretenderContext` を `null` に設定する
   - **元の要素として**マッチングする（例：`<MyButton>` として）
   - `pretenderContext` を復元する
   - 結果を返す

これにより、`button` をターゲットにしたルールが pretender にマッチし、`MyButton` をターゲットにしたルールが引き続き元の要素にマッチすることが保証されます。

### `closest(selectors)`

`this` から `parentElement` チェーンを遡り、`matches(selectors)` が `true` になる最初の要素を返します。

## Pretender システム

Pretender システムのアーキテクチャ、初期化フロー、プロパティ委譲、アクセシブル名の統合についての包括的なドキュメントは、専用の [Pretender システム](./pretender.ja.md)リファレンスを参照してください。

## その他のメソッド

| メソッド                 | シグネチャ                                        | 説明                                                                               |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `fixNodeName`            | `fixNodeName(name: string): void`                 | リント自動修正用に `fixedNodeName` を更新する                                      |
| `getAccessibleName`      | `getAccessibleName(version: ARIAVersion): string` | `getAccname()` を通じてアクセシブル名を計算する                                    |
| `toNormalizeString`      | `toNormalizeString(): string`                     | 比較用の正規化された表現を返す（キャッシュ済み）。子要素と属性を再帰的に正規化する |
| `nextElementSibling`     | `get nextElementSibling: MLElement \| null`       | 次の兄弟要素                                                                       |
| `previousElementSibling` | `get previousElementSibling: MLElement \| null`   | 前の兄弟要素                                                                       |

## 可変な子要素の検出

### `hasMutableChildren(attr?)`

要素の子が非決定的な場合に `true` を返します。`getPureChildNodes()` を反復します：

- `conditionalType` を**持たない** `MLBlock` の子が存在する（つまり `conditionalType` が `null` -- `'if'` や `'each'` のような認識された条件分岐型を持つブロックは `conditionalChildNodes()` で処理されるためスキップされる）
- `<slot>` の子要素が存在する（コンテンツは実行時に注入される）
- `attr` が `true` の場合：子要素のいずれかが `hasMutableAttributes() === true` を持つ
- 子要素に対して再帰的に `hasMutableChildren()` をチェックする

これは `permitted-contents` などのルールが、子要素が予測不可能な場合に検証をスキップするかどうかを判断するために使用されます。

## `getChildElementsAndTextNodeWithoutWhitespaces()`

省略された要素をフラット化した `MLElement | MLText`（非空白）の子のフラット配列を返します：

1. `childNodes` を反復する
2. 要素の場合：`isOmitted` なら再帰的にその子を取得し、代わりにそれらを含める（フラット化）
3. テキストノードの場合：空白でない場合のみ含める
4. 結果はキャッシュされる

これはコンテンツモデルの検証に使用されます -- 暗黙の `<tbody>` のような省略された要素は、コンテンツモデルの目的では透過的です。

## 省略された（ゴースト）要素

`isOmitted === true` の要素はパーサーによって暗黙的に挿入されたものです（例：HTML パーサーが省略された `<tbody>` を挿入）。これらの要素は：

- 対応するソーストークンを持たない
- `prevToken` によってスキップされる（有効なオフセットチェーンを維持するため）
- `toString(fixed)` から `raw` を返す（ソースに修正すべきものがないため修正は適用されない）
- `getChildElementsAndTextNodeWithoutWhitespaces()` によってフラット化される

## 閉じタグ

| プロパティ           | 型                          | 説明                                                                                 |
| -------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `closeTag`           | `MLElementCloseTag \| null` | ペアの閉じタグ。void 要素、自己閉じ要素、または `endTag === 'never'` の場合は `null` |
| `selfClosingSolidus` | `MLToken \| null`           | `<br />` の `/` トークン。自己閉じでない場合は `null`                                |

## `toString(fixed?)`

修正を適用して要素のソース文字列を再構築します。

- `fixed=false` または pretender/省略要素/`#` プレフィックスの nodeName → `raw` を返す
- `fixed=true`:
  1. 置換可能なノードのリストを構築する：`[tagOpenChar + fixedNodeName, ...overriddenCommentNodes, ...attributes]`
  2. 各ノードに対して、正しいオフセットで `node.toString(true)` をスプライスする
  3. 正確な位置決めのために累積オフセット差を追跡する

```
Original: <DIV class="foo" >
Fixed:    <div class="foo" >
          ^^^^              (fixedNodeName が "DIV" から "div" に変更)
```

## その他のプロパティ

| プロパティ         | 型               | 説明                                          |
| ------------------ | ---------------- | --------------------------------------------- |
| `namespaceURI`     | `NamespaceURI`   | 要素の名前空間（HTML, SVG, MathML）           |
| `isForeignElement` | `boolean`        | SVG/MathML 要素の場合 `true`                  |
| `elementType`      | `ElementType`    | `'html'` \| `'web-component'` \| `'authored'` |
| `isOmitted`        | `boolean`        | 暗黙的に挿入された要素の場合 `true`           |
| `classList`        | `MLDomTokenList` | `class` 属性からの CSS クラスリスト           |
| `className`        | `string`         | class 属性値                                  |
| `id`               | `string`         | ID 属性値（存在しない場合は空文字列）         |
| `hasSpreadAttr`    | `boolean`        | 要素にスプレッド属性があるかどうか            |
| `tagOpenChar`      | `string`         | 開始タグ区切り文字（例: `<` または `<%`）     |
| `tagCloseChar`     | `string`         | 閉じタグ区切り文字（例: `>` または `%>`）     |
