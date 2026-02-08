# HTML コンテンツモデルアルゴリズム

## 概要

`@markuplint/ml-spec` パッケージは、[HTML Living Standard](https://html.spec.whatwg.org/multipage/dom.html#content-models) に基づくコンテンツモデル評価および要素分類アルゴリズムを実装しています。これらの関数は DOM の `Element` インターフェースと `MLMLSpec`（markuplint の仕様データ）を組み合わせて、要素が含むことのできるコンテンツ、要素がボイド要素か、パルパブルか、フォーカス可能かなどを判定します。

HTML アルゴリズム関数はすべて `src/algorithm/html/` 配下に配置されています。

コンテンツモデルカテゴリの型は `src/types/permitted-structures.ts` で定義されており、**10 の HTML カテゴリ**と **19 の SVG カテゴリ**でコンテンツモデルシステムの基盤を構成しています。

## コンテンツモデルシステム

### カテゴリからセレクタへのマッピング

仕様定義（`SpecDefs['#contentModels']`）は、各 `Category` 文字列を CSS セレクタ文字列の読み取り専用配列にマッピングします。

```typescript
type SpecDefs = {
  readonly '#contentModels': {
    readonly [model in Category]?: readonly string[];
  };
};
```

各カテゴリは、そのカテゴリに属する要素を特定するセレクタにマッピングされます。例:

- `#flow` は `['a', 'abbr', 'address', ...]` にマッピング
- `#interactive` は `['a[href]', 'audio[controls]', ...]` にマッピング

一部のセレクタには属性条件（`a[href]`、`audio[controls]`）が含まれていることに注目してください。これは、要素のカテゴリへの所属がその属性に依存する場合があることを意味します。HTML Standard の条件付きコンテンツモデルはこの仕組みで表現されています。

### 条件付きコンテンツモデル

要素の許可されるコンテンツは、その属性に基づいて変化する場合があります。`ContentModel` インターフェースはこれをサポートします。

```typescript
interface ContentModel {
  contents: PermittedContentPattern[] | boolean;
  descendantOf?: string;
  conditional?: {
    condition: string;
    contents: PermittedContentPattern[] | boolean;
  }[];
}
```

`conditional` が存在する場合、各条件の `condition` 文字列が `el.matches(condition)` で検査されます。最初にマッチした条件の `contents` 値が使用されます。どの条件にもマッチしない場合、デフォルトの `contents` 値が適用されます。

## 関数リファレンス

### 1. `getContentModel(el, specs)`

**ファイル:** `src/algorithm/html/get-content-model.ts`

要素の許可されるコンテンツモデルを取得します。

```typescript
function getContentModel(
  el: Element,
  specs: readonly Pick<ElementSpec, 'name' | 'contentModel'>[],
): ReadonlyDeep<PermittedContentPattern[]> | boolean | null;
```

**パラメータ:**

| パラメータ | 型                                                       | 説明                                      |
| ---------- | -------------------------------------------------------- | ----------------------------------------- |
| `el`       | `Element`                                                | コンテンツモデルを取得する対象の DOM 要素 |
| `specs`    | `readonly Pick<ElementSpec, 'name' \| 'contentModel'>[]` | コンテンツモデル定義を含む要素仕様        |

**戻り値:**

| 値                          | 意味                                 |
| --------------------------- | ------------------------------------ |
| `PermittedContentPattern[]` | 要素に対する具体的なコンテンツルール |
| `true`                      | あらゆるコンテンツが許可される       |
| `false`                     | コンテンツが許可されない             |
| `null`                      | 要素の仕様が見つからない             |

**動作:**

1. ネストされた `Map<Specs, Map<Element, result>>` キャッシュを確認します。指定された specs 参照と要素インスタンスに対するキャッシュ結果が存在すれば、即座に返します。
2. `getSpec()` を使用して要素の仕様を検索します。見つからない場合、`null` をキャッシュして返します。
3. `contentModel.conditional[]`（存在する場合）を走査します。各条件に対して `el.matches(cond.condition)` を呼び出します。
4. 最初にマッチした条件の `contents` を返します。どの条件にもマッチしない場合、デフォルトの `contentModel.contents` を返します。
5. すべての結果は返却前にキャッシュされます。

**キャッシュ戦略:**

キャッシュは 2 階層の `Map` です。外側のマップは `specs` 配列の参照をキーとし、内側のマップは `Element` インスタンスをキーとします。これにより、specs が変更された場合に結果が正しく無効化される一方、同じ要素に対する冗長な計算を回避できます。

---

### 2. `isPalpableElement(el, specs, options?)`

**ファイル:** `src/algorithm/html/is-palpable-elements.ts`

要素がパルパブルコンテンツと見なされるかどうかを判定します。パルパブル要素とは、ユーザーに対して可視的または意味のあるコンテンツをレンダリングする要素です。

```typescript
function isPalpableElement(
  el: Element,
  specs: MLMLSpec,
  options?: {
    readonly extendsSvg?: boolean;
    readonly extendsExposableElements?: boolean;
  },
): boolean;
```

**パラメータ:**

| パラメータ                         | 型         | デフォルト | 説明                                  |
| ---------------------------------- | ---------- | ---------- | ------------------------------------- |
| `el`                               | `Element`  | --         | チェック対象の DOM 要素               |
| `specs`                            | `MLMLSpec` | --         | マークアップ言語の完全な仕様          |
| `options.extendsSvg`               | `boolean`  | `true`     | `#SVGRenderable` 要素を含めるかどうか |
| `options.extendsExposableElements` | `boolean`  | `false`    | 追加の露出可能な要素を含めるかどうか  |

**露出可能な要素**（意味的に重要だが `#palpable` カテゴリには属さない要素）:

`body`, `dd`, `dt`, `figcaption`, `html`, `legend`, `li`, `optgroup`, `option`, `rp`, `rt`, `summary`, `tbody`, `td`, `tfoot`, `th`, `thead`, `tr`

**動作:**

1. `#palpable` コンテンツモデルカテゴリから CSS セレクタを収集します。
2. `extendsSvg` が `false` でない場合（デフォルト: `true`）、`#SVGRenderable` セレクタを追加します。
3. `extendsExposableElements` が `true` の場合（デフォルト: `false`）、ハードコードされた露出可能要素のリストを追加します。
4. 収集されたセレクタ文字列のいずれかに対して `el.matches()` が成功すれば `true` を返します。

> **警告:** この実装は著者による HTML 仕様の解釈を含んでいます。不正確な点を発見した場合は、https://github.com/markuplint/markuplint/issues/new で Issue を報告してください。

---

### 3. `isVoidElement(el)`

**ファイル:** `src/algorithm/html/is-void-element.ts`

HTML 仕様で定義されたボイド要素かどうかを判定します。ボイド要素はコンテンツを持つことができません。

```typescript
function isVoidElement(el: { readonly localName: string }): boolean;
```

**パラメータ:**

| パラメータ | 型                               | 説明                                           |
| ---------- | -------------------------------- | ---------------------------------------------- |
| `el`       | `{ readonly localName: string }` | `localName` プロパティを持つ任意のオブジェクト |

この関数は DOM `Element` だけでなく、`localName` プロパティを持つ任意のオブジェクトを受け付けることに注意してください。これにより、完全な Element が利用できないコンテキストでも使用可能です。

**ボイド要素（13 個）:**

`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, `wbr`

リストは O(1) のルックアップ性能のために `Set` として格納されています。

**仕様:** https://html.spec.whatwg.org/multipage/syntax.html#void-elements

---

### 4. `isNothingContentModel(el)`

**ファイル:** `src/algorithm/html/is-nothing-content-model.ts`

要素が「nothing」コンテンツモデルを使用するかどうかを判定します。これは、要素がコンテンツを一切含んではならないことを意味します。

```typescript
function isNothingContentModel(el: Element): boolean;
```

**パラメータ:**

| パラメータ | 型        | 説明                    |
| ---------- | --------- | ----------------------- |
| `el`       | `Element` | チェック対象の DOM 要素 |

**動作:**

以下のいずれかに該当する場合 `true` を返します:

- **ボイド要素**である（`isVoidElement()` に委譲）
- `<iframe>` 要素である
- `<template>` 要素である

`<iframe>` と `<template>` はボイド要素ではありませんが、HTML 仕様上「nothing」コンテンツモデルを使用します。iframe のコンテンツは別のコンテンツに置換され、template のコンテンツは別のドキュメントフラグメントに格納されるためです。

**仕様:** https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model

---

### 5. `mayBeFocusable(el, specs)`

**ファイル:** `src/algorithm/html/may-be-focusable.ts`

要素がフォーカス可能である可能性があるかどうかをヒューリスティックに判定します。

```typescript
function mayBeFocusable(el: Element, specs: MLMLSpec): boolean;
```

**パラメータ:**

| パラメータ | 型         | 説明                                                             |
| ---------- | ---------- | ---------------------------------------------------------------- |
| `el`       | `Element`  | チェック対象の DOM 要素                                          |
| `specs`    | `MLMLSpec` | インタラクティブコンテンツ定義を含むマークアップ言語の完全な仕様 |

**動作:**

要素を以下のセレクタに対してマッチングします:

1. `#interactive` コンテンツモデルカテゴリのすべてのセレクタ（`getSelectorsByContentModelCategory()` で取得）
2. `[tabindex]` -- `tabindex` 属性を持つ任意の要素
3. `[contenteditable]:not([contenteditable="false" i])` -- contenteditable 要素（大文字小文字を区別しない比較）

これらのセレクタのいずれかに対して `el.matches()` が成功すれば `true` を返します。

**制限事項:**

これは静的なヒューリスティックです。フォーカス可能性を妨げる可能性のあるランタイム状態は考慮**しません**:

- フォーム要素の `disabled` 属性
- `inert` 属性
- CSS によって非表示にされた要素（`display: none`、`visibility: hidden`）
- Shadow DOM の境界

この関数は主に ARIA ロール計算で使用され、WAI-ARIA 仕様に従い、フォーカス可能な要素にプレゼンテーショナルロール（`role="none"` / `role="presentation"`）が適用されるのを防ぎます。

---

### 6. `getSelectorsByContentModelCategory(specs, category)`

**ファイル:** `src/algorithm/html/get-selectors-by-content-model-category.ts`

コンテンツモデルカテゴリに関連付けられた CSS セレクタを取得するためのダイレクトアクセサです。

```typescript
function getSelectorsByContentModelCategory(specs: MLMLSpec, category: Category): ReadonlyArray<string>;
```

**パラメータ:**

| パラメータ | 型         | 説明                                                          |
| ---------- | ---------- | ------------------------------------------------------------- |
| `specs`    | `MLMLSpec` | マークアップ言語の完全な仕様                                  |
| `category` | `Category` | コンテンツモデルカテゴリ識別子（例: `#flow`、`#interactive`） |

**戻り値:**

カテゴリの CSS セレクタ文字列の読み取り専用配列。カテゴリが仕様に定義されていない場合は空配列を返します。

**実装:**

```typescript
const selectors = specs.def['#contentModels'][category];
return selectors ?? [];
```

直接的なプロパティアクセスに対する null 安全性を提供する薄いラッパーです。

---

### 7. `contentModelCategoryToTagNames(contentModel, def)`

**ファイル:** `src/algorithm/html/content-model-category-to-tag-names.ts`

コンテンツモデルカテゴリを、そのカテゴリに属するタグ名のソート済み・凍結済み配列に変換します。

```typescript
function contentModelCategoryToTagNames(contentModel: Category, def: MLMLSpec['def']): ReadonlyArray<string>;
```

**パラメータ:**

| パラメータ     | 型                | 説明                           |
| -------------- | ----------------- | ------------------------------ |
| `contentModel` | `Category`        | コンテンツモデルカテゴリ識別子 |
| `def`          | `MLMLSpec['def']` | 仕様定義                       |

**戻り値:**

`Object.freeze()` されたソート済みのタグ名文字列配列。カテゴリが定義されていないかエントリがない場合は、凍結された空配列を返します。

**キャッシュ:**

結果はモジュールレベルの `Map<Category, ReadonlyArray<string>>` にキャッシュされます。一度あるカテゴリについて計算されると、以降の呼び出しではその結果が再利用されます。

**重要な注意:** この関数はコンテンツモデル定義に格納されたセレクタ文字列からタグ名を直接取得します。CSS セレクタの解析は行いません。`#contentModels` のセレクタは単純なタグ名またはタグ＋属性セレクタであることが前提です。複雑なセレクタはタグ名に正しく分解されない場合があります。

## コンテンツモデルカテゴリ

### HTML カテゴリ（10）

| カテゴリ             | 説明                                     | 要素の例                                                    |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `#text`              | テキストコンテンツ                       | テキストノード                                              |
| `#phrasing`          | インラインレベルコンテンツ               | `a`, `em`, `strong`, `span`, `img`                          |
| `#flow`              | ブロックレベルおよびインラインコンテンツ | ほぼすべての body 内要素                                    |
| `#interactive`       | ユーザーが操作可能なコンテンツ           | `a[href]`, `button`, `input`, `select`                      |
| `#heading`           | セクション見出し                         | `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                          |
| `#sectioning`        | 文書構造セクション                       | `article`, `aside`, `nav`, `section`                        |
| `#metadata`          | 文書に関するメタデータ                   | `base`, `link`, `meta`, `script`, `style`, `title`          |
| `#embedded`          | 文書に埋め込まれた外部コンテンツ         | `audio`, `canvas`, `embed`, `iframe`, `img`, `video`        |
| `#palpable`          | 可視的・意味のあるコンテンツ             | メタデータ以外のほとんどのフロー/フレージングコンテンツ要素 |
| `#script-supporting` | スクリプトインフラストラクチャ           | `script`, `template`                                        |

### SVG カテゴリ（19）

| カテゴリ                   | 説明                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| `#SVGAnimation`            | SVG アニメーション要素（`animate`、`animateMotion` など）                      |
| `#SVGBasicShapes`          | 基本図形要素（`circle`、`ellipse`、`line`、`polygon`、`polyline`、`rect`）     |
| `#SVGContainer`            | コンテナ要素（`a`、`defs`、`g`、`marker`、`mask`、`svg`、`symbol` など）       |
| `#SVGDescriptive`          | 説明要素（`desc`、`metadata`、`title`）                                        |
| `#SVGFilterPrimitive`      | フィルタプリミティブ要素（`feBlend`、`feColorMatrix`、`feGaussianBlur` など）  |
| `#SVGFont`                 | フォント要素（非推奨: `font`、`font-face` など）                               |
| `#SVGGradient`             | グラデーション要素（`linearGradient`、`radialGradient`、`stop`）               |
| `#SVGGraphics`             | グラフィックス要素（図形、画像、テキストなど）                                 |
| `#SVGGraphicsReferencing`  | グラフィックス参照要素（`image`、`use`）                                       |
| `#SVGLightSource`          | 光源要素（`feDistantLight`、`fePointLight`、`feSpotLight`）                    |
| `#SVGNeverRendered`        | 直接レンダリングされない要素（`clipPath`、`defs`、`linearGradient` など）      |
| `#SVGNone`                 | コンテンツ不可                                                                 |
| `#SVGPaintServer`          | ペイントサーバー要素（`linearGradient`、`pattern`、`radialGradient` など）     |
| `#SVGRenderable`           | レンダリング可能な要素（`a`、`circle`、`g`、`rect`、`svg`、`text` など）       |
| `#SVGShape`                | 図形要素（`circle`、`ellipse`、`line`、`path`、`polygon`、`polyline`、`rect`） |
| `#SVGStructural`           | 構造要素（`defs`、`g`、`svg`、`symbol`、`use`）                                |
| `#SVGStructurallyExternal` | 構造的外部要素（`image`、`use`）                                               |
| `#SVGTextContent`          | テキストコンテンツ要素（`text`、`textPath`、`tspan`）                          |
| `#SVGTextContentChild`     | テキストコンテンツ子要素（`textPath`、`tspan`）                                |

## PermittedContentPattern フォーマット

`PermittedContentPattern` 型は 6 つのパターン型の判別共用体（discriminated union）です。これらのパターンは `src/types/permitted-structures.ts` で定義されており、JSON Schema から自動生成されています。

### パターン型

#### `PermittedContentRequire`

出現しなければならない必須コンテンツを指定します。

```typescript
interface PermittedContentRequire {
  require: Model | PermittedContentPattern[];
  min?: number;
  max?: number;
}
```

**例:** ちょうど 1 つの `<caption>` を必要とする要素:

```json
{ "require": "caption", "min": 1, "max": 1 }
```

#### `PermittedContentOptional`

任意で出現してもよいコンテンツを指定します。

```typescript
interface PermittedContentOptional {
  optional: Model | PermittedContentPattern[];
  max?: number;
}
```

**例:** オプションの `<thead>`:

```json
{ "optional": "thead", "max": 1 }
```

#### `PermittedContentOneOrMore`

少なくとも 1 回は出現しなければならないコンテンツを指定します（1..N）。

```typescript
interface PermittedContentOneOrMore {
  oneOrMore: Model | PermittedContentPattern[];
  max?: number;
}
```

**例:** 1 つ以上の `<tr>` 要素:

```json
{ "oneOrMore": "tr" }
```

#### `PermittedContentZeroOrMore`

任意の回数出現してもよいコンテンツを指定します（0..N）。

```typescript
interface PermittedContentZeroOrMore {
  zeroOrMore: Model | PermittedContentPattern[];
  max?: number;
}
```

**例:** 0 個以上のフローコンテンツの子要素:

```json
{ "zeroOrMore": "#flow" }
```

#### `PermittedContentChoice`

2 つから 5 つの代替コンテンツパターンの選択を指定します。

```typescript
interface PermittedContentChoice {
  choice:
    | [PermittedContentPattern[], PermittedContentPattern[]]
    | [PermittedContentPattern[], PermittedContentPattern[], PermittedContentPattern[]]
    | [
        /* 4 つの選択肢 */
      ]
    | [
        /* 5 つの選択肢 */
      ];
}
```

**例:** フローコンテンツ、または `<param>` 要素の後にフローコンテンツ:

```json
{
  "choice": [[{ "zeroOrMore": "#flow" }], [{ "oneOrMore": "param" }, { "zeroOrMore": "#flow" }]]
}
```

#### `PermittedContentTransparent`

要素が親のコンテンツモデルを継承することを示します（透過的コンテンツモデル）。

```typescript
interface PermittedContentTransparent {
  transparent: string;
}
```

**例:** `<a>` 要素は透過的:

```json
{ "transparent": "a" }
```

### `Model` 型

`require`、`optional`、`oneOrMore`、`zeroOrMore` プロパティは `Model` 値を受け付けます。定義は以下の通りです:

```typescript
type Model = ContentType | ContentType[];
type ContentType = string | Category;
```

- 単一の文字列: タグ名（例: `"div"`）またはカテゴリ（例: `"#flow"`）
- 文字列の配列: 複数の許可される型（論理 OR）

## HTML Standard 参照リンク

- [コンテンツモデル](https://html.spec.whatwg.org/multipage/dom.html#content-models)
- [ボイド要素](https://html.spec.whatwg.org/multipage/syntax.html#void-elements)
- [インタラクティブコンテンツ](https://html.spec.whatwg.org/multipage/dom.html#interactive-content)
- [パルパブルコンテンツ](https://html.spec.whatwg.org/multipage/dom.html#palpable-content)
- [nothing コンテンツモデル](https://html.spec.whatwg.org/multipage/dom.html#the-nothing-content-model)
- [要素インデックス](https://html.spec.whatwg.org/multipage/indices.html#elements-3)
