# 要素仕様フォーマット

`@markuplint/html-spec` パッケージにおける要素仕様 JSON ファイルの包括的なリファレンスガイドです。各 `src/spec.*.json` ファイルは 1 つの HTML または SVG 要素の仕様を定義し、コンテンツモデル、属性、ARIA マッピングなどの情報を含みます。

## ファイル命名規則

### HTML 要素

ファイル名パターン: `src/spec.<tag>.json`

```
spec.div.json       # <div> 要素
spec.table.json     # <table> 要素
spec.input.json     # <input> 要素
spec.a.json         # <a> 要素
spec.p.json         # <p> 要素
```

タグ名はそのままファイル名に使用されます。

### SVG 要素

ファイル名パターン: `src/spec.svg_<local>.json`

```
spec.svg_text.json     # <svg:text> 要素
spec.svg_circle.json   # <svg:circle> 要素
spec.svg_rect.json     # <svg:rect> 要素
spec.svg_path.json     # <svg:path> 要素
```

ファイル名のプレフィックス `svg_` から、要素名は `svg:<local>` として推論されます（例: `spec.svg_text.json` は `svg:text` に対応）。

### 共通定義ファイル

| ファイル                      | 内容                                               |
| ----------------------------- | -------------------------------------------------- |
| `spec-common.attributes.json` | グローバル属性カテゴリ定義（19 カテゴリ）          |
| `spec-common.contents.json`   | コンテンツモデルカテゴリマクロ（HTML 10 + SVG 19） |

## 要素仕様の構造

各仕様ファイルは JSON オブジェクトです。`strip-json-comments` によるコメント（`//` 形式）に対応しており、ファイル先頭に仕様の参照 URL を記載するのが慣例です。

トップレベルフィールドは以下の 4 つです。

| フィールド     | 型       | 説明                                       |
| -------------- | -------- | ------------------------------------------ |
| `contentModel` | `object` | 許可されるコンテンツの定義                 |
| `globalAttrs`  | `object` | 使用するグローバル属性カテゴリのマッピング |
| `attributes`   | `object` | 要素固有の属性定義                         |
| `aria`         | `object` | ARIA 統合仕様（暗黙ロール、許可ロール等）  |

---

## `contentModel`

コンテンツモデルは要素が許可する子要素のパターンを定義します。

### `contents`

`contents` フィールドは許可されるコンテンツを記述します。取りうる値は以下の 3 種類です。

- **`false`** -- void 要素（子要素を持てない）。例: `<input>`, `<br>`, `<img>`
- **`true`** -- 任意のコンテンツを許可（主に廃止要素に使用）
- **配列** -- コンテンツモデルパターンの配列

```jsonc
// void 要素（子要素不可）
"contents": false

// 任意のコンテンツ許可
"contents": true

// パターン指定
"contents": [
  { "oneOrMore": ":model(phrasing)" }
]
```

### `conditional`

コンテキスト依存のコンテンツモデルオーバーライドの配列です。要素の親要素や祖先要素の構造に応じて、異なるコンテンツモデルを適用する場合に使用します。

各エントリは以下のフィールドを持ちます。

| フィールド  | 型       | 説明                                         |
| ----------- | -------- | -------------------------------------------- |
| `condition` | `string` | CSS セレクタ形式の条件式                     |
| `contents`  | `array`  | 条件に合致した場合のコンテンツモデルパターン |

```jsonc
"conditional": [
  {
    "condition": "dl > div",
    "contents": [
      {
        "oneOrMore": [
          { "zeroOrMore": ":model(script-supporting)" },
          { "oneOrMore": "dt" },
          { "zeroOrMore": ":model(script-supporting)" },
          { "oneOrMore": "dd" },
          { "zeroOrMore": ":model(script-supporting)" }
        ]
      }
    ]
  }
]
```

上記の例では、`<div>` が `<dl>` の直接の子である場合、通常のフローコンテンツではなく `<dt>` と `<dd>` のペアを要求します。

### 他パッケージとの関連

ここで定義するコンテンツモデルは、複数のパッケージにまたがるエコシステムの一部です。

- **スキーマ検証** -- `@markuplint/ml-spec` の `content-models.schema.json` がコンテンツモデルパターン（`require`、`optional`、`oneOrMore`、`zeroOrMore`、`choice`、`transparent`）の有効な構造を定義しています。テスト時にソース JSON ファイルがこのスキーマに対して検証されます。
- **TypeScript 型** -- `@markuplint/ml-spec` がスキーマから `ContentModel`、`PermittedContentPattern`、`Category` 等の型を自動生成し（`types/permitted-structures.ts`）、コードベース全体で型安全なアクセスを提供します。
- **ランタイムアルゴリズム** -- `@markuplint/ml-spec` の `getContentModel()` が条件付きコンテンツモデルを実行時に評価し、`contentModelCategoryToTagNames()` がカテゴリ名（例: `#flow`）を本パッケージの `spec-common.contents.json` の `def["#contentModels"]` を用いて具体的な要素リストに解決します。
- **リントルール** -- `@markuplint/rules` の `permitted-contents` ルールが子要素をコンテンツモデルパターンに対して検証し、`no-empty-palpable-content` ルールが `#palpable` カテゴリデータを使用して空のパルパブル要素を検出します。

---

## コンテンツモデルパターン

コンテンツモデルの `contents` 配列内で使用可能なパターンタイプの一覧です。

### 量指定パターン

| パターン                         | 説明                            |
| -------------------------------- | ------------------------------- |
| `{ "require": "<selector>" }`    | 必須要素（ちょうど 1 つ）       |
| `{ "optional": "<selector>" }`   | オプション要素（0 または 1 つ） |
| `{ "oneOrMore": "<selector>" }`  | 1 つ以上                        |
| `{ "zeroOrMore": "<selector>" }` | 0 個以上                        |

`oneOrMore` と `zeroOrMore` は、文字列（単一セレクタ）またはパターン配列（シーケンス）を値として受け取ります。

```jsonc
// 単一セレクタ
{ "oneOrMore": "li" }

// シーケンス（順序付き複数パターン）
{
  "oneOrMore": [
    { "oneOrMore": "dt" },
    { "oneOrMore": "dd" }
  ]
}
```

### 構造パターン

| パターン                          | 説明                                               |
| --------------------------------- | -------------------------------------------------- |
| `{ "choice": [...] }`             | 選択肢の中から 1 つを許可                          |
| `{ "interleave": [...] }`         | インターリーブ（任意の順序で混在可能）             |
| `{ "transparent": "<selector>" }` | 透過コンテンツモデル（親のコンテンツモデルを継承） |

`transparent` は、要素自体がコンテンツモデルを定義せず、親要素のコンテンツモデルを「透過的に」引き継ぐことを示します。値にはセレクタが指定され、透過コンテンツから除外される要素を記述します。

```jsonc
// <a> 要素の透過コンテンツモデル
// インタラクティブコンテンツと <a> 自身、tabindex 付き要素を除外
{
  "transparent": ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))",
}
```

### セレクタの種類

コンテンツモデルパターンのセレクタとして使用可能な形式です。

| セレクタ形式   | 説明                                | 例                                     |
| -------------- | ----------------------------------- | -------------------------------------- |
| タグ名         | HTML 要素名                         | `"dt"`, `"dd"`, `"li"`, `"option"`     |
| カテゴリ参照   | `:model()` 擬似クラスによるカテゴリ | `":model(flow)"`, `":model(phrasing)"` |
| 否定セレクタ   | `:not()` との組み合わせ             | `":not(:model(interactive), a)"`       |
| テキストノード | テキストコンテンツ                  | `"#text"`                              |
| カスタム要素   | カスタム要素のワイルドカード        | `"#custom"`                            |
| SVG 名前空間   | パイプ記法による名前空間指定        | `"svg\|a"`, `"svg\|circle"`            |
| 属性セレクタ   | 属性条件付き要素                    | `"a[href]"`, `"link[itemprop]"`        |

---

## `globalAttrs`

グローバル属性カテゴリ名から、そのカテゴリの属性をどのようにインクルードするかを定義するマッピングオブジェクトです。

### インクルードルール

| 値         | 説明                               |
| ---------- | ---------------------------------- |
| `true`     | カテゴリの全属性を含む             |
| `false`    | カテゴリを除外する                 |
| `string[]` | カテゴリから指定した属性のみを含む |

```jsonc
"globalAttrs": {
  // 全属性を含む
  "#HTMLGlobalAttrs": true,
  "#GlobalEventAttrs": true,
  "#ARIAAttrs": true,

  // カテゴリから特定の属性のみ選択
  "#HTMLLinkAndFetchingAttrs": ["href", "target", "download", "ping", "rel", "hreflang", "type", "referrerpolicy"],

  // SVG 要素でのプレゼンテーション属性の選択的インクルード
  "#SVGPresentationAttrs": ["fill", "stroke", "opacity", "transform"]
}
```

### 利用可能なグローバル属性カテゴリ（19 カテゴリ）

#### HTML カテゴリ

| カテゴリ                           | 説明                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `#HTMLGlobalAttrs`                 | 標準 HTML グローバル属性（`accesskey`, `class`, `id`, `dir`, `lang`, `style`, `tabindex` 等） |
| `#GlobalEventAttrs`                | イベントハンドラ属性（`onclick`, `onload`, `onchange`, `oninput` 等）                         |
| `#ARIAAttrs`                       | ARIA 属性（`aria-*`, `role`）                                                                 |
| `#HTMLLinkAndFetchingAttrs`        | リンク/フェッチ関連属性（`href`, `target`, `download`, `rel`, `referrerpolicy` 等）           |
| `#HTMLEmbededAndMediaContentAttrs` | 埋め込みコンテンツ属性（`src`, `height`, `width`, `alt` 等）                                  |
| `#HTMLFormControlElementAttrs`     | フォームコントロール属性（`autocomplete`, `disabled`, `name`, `form`, `required` 等）         |
| `#HTMLTableCellElementAttrs`       | テーブルセル属性（`colspan`, `rowspan`, `headers` 等）                                        |

#### SVG カテゴリ

| カテゴリ                            | 説明                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `#SVGAnimationAdditionAttrs`        | SVG アニメーション加算属性                                                |
| `#SVGAnimationAttributeTargetAttrs` | SVG アニメーション属性ターゲット                                          |
| `#SVGAnimationEventAttrs`           | SVG アニメーションイベント属性                                            |
| `#SVGAnimationTargetElementAttrs`   | SVG アニメーションターゲット要素                                          |
| `#SVGAnimationTimingAttrs`          | SVG アニメーションタイミング属性                                          |
| `#SVGAnimationValueAttrs`           | SVG アニメーション値属性                                                  |
| `#SVGConditionalProcessingAttrs`    | SVG 条件付き処理属性（`requiredExtensions`, `systemLanguage`）            |
| `#SVGCoreAttrs`                     | SVG コア属性（`id`, `tabindex`, `lang`, `class`, `style` 等）             |
| `#SVGFilterPrimitiveAttrs`          | SVG フィルタプリミティブ属性                                              |
| `#SVGPresentationAttrs`             | SVG プレゼンテーション属性（`fill`, `stroke`, `opacity`, `transform` 等） |
| `#SVGTransferFunctionAttrs`         | SVG 転送関数属性                                                          |
| `#XLinkAttrs`                       | XLink 属性（非推奨）                                                      |

---

## `attributes`

要素固有の属性定義です。属性名をキーとし、属性定義オブジェクトを値とするマッピングです。

### 属性定義フィールド

| フィールド     | 型                   | 説明                                   |
| -------------- | -------------------- | -------------------------------------- |
| `type`         | 後述                 | 属性値の型制約                         |
| `condition`    | `string \| string[]` | 属性が有効となる条件（CSS セレクタ）   |
| `required`     | `boolean`            | 必須属性かどうか                       |
| `defaultValue` | `string`             | デフォルト値                           |
| `description`  | `string`             | 属性の説明                             |
| `experimental` | `boolean`            | 実験的な属性（後述）                   |
| `obsolete`     | `boolean`            | 廃止された属性（後述）                 |
| `deprecated`   | `boolean`            | 非推奨の属性（後述）                   |
| `nonStandard`  | `boolean`            | 非標準の属性（後述）                   |
| `animatable`   | `boolean`            | アニメーション可能か（SVG 属性で使用） |

### ステータスフラグ

属性の標準化状態を示す真偽値フラグ:

| フラグ         | 意味                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `experimental` | まだ安定していない新興の仕様の一部。ブラウザのサポートが部分的またはプレフィックス付きの場合がある。 |
| `deprecated`   | 仕様で公式に非推奨とされている。ブラウザでは認識されるが、新しいコードでは使用すべきでない。         |
| `obsolete`     | 仕様から完全に削除された。モダンブラウザでは認識されない可能性がある。                               |
| `nonStandard`  | W3C や WHATWG の仕様に含まれない。ベンダー固有またはプロプライエタリ。                               |

**`deprecated` と `obsolete` の違い:** `deprecated` は仕様が属性を定義しつつも使用を
非推奨としている状態（例: `<table border>`）。`obsolete` は仕様から完全に削除された状態
（例: 完全に廃止された要素のレガシーなプレゼンテーション属性）。実際の動作として、
`deprecated` な属性は通常ブラウザで動作するが、`obsolete` な属性は動作しない場合がある。

**フラグの優先順位（仕様ファイル > MDN）:** 手動仕様ファイル（`src/spec.*.json`）で
フラグを設定した場合、MDN スクレイピングの値よりも優先される。これにより、MDN データが
不正確または仕様に追いついていない場合を修正できる。MDN のフラグは、手動仕様に属性定義が
ない場合、または該当フラグが設定されていない場合にのみ使用される。

**フラグを手動設定する場面:**

- MDN が `experimental` としているが仕様が安定した場合 -- 仕様ファイルで
  `"experimental": false` を設定（または省略）してオーバーライド
- 仕様で非推奨だが MDN が未更新の場合 -- 仕様ファイルで `"deprecated": true` を設定
- ベンダー固有の属性をマークする場合 -- `"nonStandard": true` を設定

### 属性値の型 (`type`)

属性の値の型は複数の形式で指定できます。

#### 単純文字列型

よく使用される型名を文字列で指定します。

| 型名         | 説明         |
| ------------ | ------------ |
| `"String"`   | 任意の文字列 |
| `"URL"`      | URL          |
| `"Boolean"`  | 真偽値属性   |
| `"DOMID"`    | DOM ID 参照  |
| `"Any"`      | 任意の値     |
| `"DateTime"` | 日時文字列   |
| `"Number"`   | 数値         |

```jsonc
"alt": {
  "type": "Any",
  "condition": "[type='image' i]"
}
```

#### 列挙型オブジェクト

有効な値の列挙を定義します。

| フィールド                   | 型         | 説明                                 |
| ---------------------------- | ---------- | ------------------------------------ |
| `enum`                       | `string[]` | 有効な値のリスト                     |
| `invalidValueDefault`        | `string`   | 無効な値が指定された場合のデフォルト |
| `missingValueDefault`        | `string`   | 属性が省略された場合のデフォルト     |
| `disallowToSurroundBySpaces` | `boolean`  | 値の前後の空白を許可しない           |
| `sameStates`                 | `object`   | 同じ状態を表す別名のマッピング       |

```jsonc
"lengthAdjust": {
  "type": {
    "enum": ["spacing", "spacingAndGlyphs"],
    "disallowToSurroundBySpaces": false
  },
  "defaultValue": "spacing",
  "animatable": true
}
```

#### トークンリスト型

スペースまたはカンマ区切りのトークンリストを定義します。

| フィールド        | 型                   | 説明                          |
| ----------------- | -------------------- | ----------------------------- |
| `token`           | `string`             | トークンの型名                |
| `separator`       | `"space" \| "comma"` | 区切り文字                    |
| `unique`          | `boolean`            | 重複を許可しない              |
| `caseInsensitive` | `boolean`            | 大文字小文字を区別しない      |
| `ordered`         | `boolean`            | 順序が重要                    |
| `number`          | `string`             | 個数制約（`"zeroOrMore"` 等） |

```jsonc
"accept": {
  "type": {
    "token": "Accept",
    "caseInsensitive": true,
    "unique": true,
    "separator": "comma"
  },
  "condition": "[type='file' i]"
}
```

#### 数値制約型

数値範囲の制約を定義します。

```jsonc
"type": {
  "type": "integer",
  "gt": 0
}
```

#### 型の配列

複数の有効な型がある場合、配列で指定します。

```jsonc
"max": {
  "type": ["DateTime", "Number"],
  "condition": ["[type='date' i]", "[type='number' i]", "[type='range' i]"]
}
```

#### CSS/SVG 型

SVG 属性で使用される CSS やSVG 固有の型を山括弧記法で指定します。

```jsonc
"x": {
  "type": "<text-coordinate>",
  "defaultValue": "0",
  "animatable": true
},
"textLength": {
  "type": ["<svg-length>", "<percentage>"],
  "animatable": true
}
```

### 条件付き属性 (`condition`)

`condition` フィールドは、属性が有効となる条件を CSS セレクタ形式で指定します。文字列（単一条件）または文字列の配列（OR 条件）を受け取ります。

```jsonc
// 単一条件: type="file" の場合のみ有効
"accept": {
  "condition": "[type='file' i]"
}

// 複数条件（OR）: いずれかの type の場合に有効
"checked": {
  "type": "Boolean",
  "condition": ["[type='checkbox' i]", "[type='radio' i]"]
}
```

---

## `aria`

ARIA（Accessible Rich Internet Applications）統合仕様を定義します。

### 基本フィールド

| フィールド         | 型                | 説明                                           |
| ------------------ | ----------------- | ---------------------------------------------- |
| `implicitRole`     | `string \| false` | 暗黙の ARIA ロール。`false` はロールなし       |
| `permittedRoles`   | 後述              | 許可される明示的ロール                         |
| `namingProhibited` | `boolean`         | アクセシブル名が禁止されている場合 `true`      |
| `properties`       | `object`          | ARIA プロパティの制約                          |
| `conditions`       | `object`          | CSS セレクタによる条件付き ARIA オーバーライド |

### `permittedRoles` の形式

| 値         | 説明                                  |
| ---------- | ------------------------------------- |
| `true`     | 任意のロールを許可                    |
| `false`    | 明示的ロールの指定不可                |
| `string[]` | 指定されたロールのみ許可              |
| `object`   | AAM（Accessibility API Mappings）参照 |

```jsonc
// 任意のロールを許可
"permittedRoles": true

// 特定のロールのみ許可
"permittedRoles": ["button", "checkbox", "menuitem", "tab"]

// AAM 参照（SVG 要素で使用）
"permittedRoles": {
  "core-aam": true,
  "graphics-aam": true
}
```

### `conditions`

CSS セレクタをキーとし、そのセレクタに合致する場合の ARIA オーバーライドを値とするオブジェクトです。

```jsonc
"aria": {
  "implicitRole": "link",
  "permittedRoles": ["button", "checkbox", "menuitem"],
  "conditions": {
    // href 属性がない場合のオーバーライド
    ":not([href])": {
      "implicitRole": "generic",
      "permittedRoles": true,
      "namingProhibited": true
    }
  }
}
```

### `properties`

ARIA プロパティの使用制約を定義します。

```jsonc
"properties": {
  "global": true,
  "role": true,
  "without": [
    {
      "type": "not-recommended",
      "name": "aria-disabled",
      "value": "true",
      "alt": {
        "method": "remove-attr",
        "target": "href"
      }
    }
  ]
}
```

`without` 配列の各エントリは、推奨されない、または禁止された ARIA プロパティの使用を定義し、代替手段を `alt` で提示します。

### バージョン固有オーバーライド

ARIA 仕様のバージョンごとに異なるマッピングを定義できます。キーには ARIA バージョン番号（`"1.1"`, `"1.2"` 等）を使用します。

```jsonc
"aria": {
  "implicitRole": "paragraph",
  "permittedRoles": true,
  "namingProhibited": true,
  // ARIA 1.1 ではロールが定義されていない
  "1.1": {
    "implicitRole": false
  }
}
```

---

## コンテンツモデルカテゴリ

`spec-common.contents.json` に定義されるカテゴリマクロです。コンテンツモデルパターンのセレクタで `:model(<category>)` の形式で参照されます。

### HTML カテゴリ（10）

| カテゴリ             | 説明                                     | 代表的な要素                                                  |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `#metadata`          | ドキュメントメタデータ要素               | `base`, `link`, `meta`, `script`, `style`, `title`            |
| `#flow`              | 本文レベルの大半の要素                   | `div`, `p`, `table`, `form`, `a`, `span` 等                   |
| `#sectioning`        | セクショニング要素                       | `article`, `aside`, `nav`, `section`                          |
| `#heading`           | 見出し要素                               | `h1`-`h6`, `hgroup`                                           |
| `#phrasing`          | フレージング（インラインレベル）要素     | `a`, `em`, `strong`, `span`, `img`, `input` 等                |
| `#embedded`          | 埋め込みコンテンツ                       | `audio`, `canvas`, `iframe`, `img`, `video`, `svg\|svg`       |
| `#interactive`       | インタラクティブコンテンツ               | `a[href]`, `button`, `details`, `input`, `select`, `textarea` |
| `#palpable`          | 実質的なコンテンツをレンダリングする要素 | `a`, `div`, `p`, `img`, `table` 等                            |
| `#script-supporting` | スクリプトサポート要素                   | `script`, `template`                                          |

### SVG カテゴリ（19）

| カテゴリ                   | 説明                     | 代表的な要素                                                   |
| -------------------------- | ------------------------ | -------------------------------------------------------------- |
| `#SVGAnimation`            | アニメーション要素       | `svg\|animate`, `svg\|animateMotion`, `svg\|set`               |
| `#SVGBasicShapes`          | 基本図形要素             | `svg\|circle`, `svg\|rect`, `svg\|line`, `svg\|polygon`        |
| `#SVGContainer`            | コンテナ要素             | `svg\|a`, `svg\|defs`, `svg\|g`, `svg\|svg`, `svg\|symbol`     |
| `#SVGDescriptive`          | 記述要素                 | `svg\|desc`, `svg\|metadata`, `svg\|title`                     |
| `#SVGFilterPrimitive`      | フィルタプリミティブ要素 | `svg\|feBlend`, `svg\|feGaussianBlur`, `svg\|feImage`          |
| `#SVGFont`                 | フォント要素             | `svg\|font`, `svg\|font-face`, `svg\|glyph`                    |
| `#SVGGradient`             | グラデーション要素       | `svg\|linearGradient`, `svg\|radialGradient`, `svg\|stop`      |
| `#SVGGraphics`             | グラフィック要素         | `svg\|circle`, `svg\|image`, `svg\|path`, `svg\|text`          |
| `#SVGGraphicsReferencing`  | グラフィック参照要素     | `svg\|use`                                                     |
| `#SVGLightSource`          | 光源要素                 | `svg\|feDistantLight`, `svg\|fePointLight`, `svg\|feSpotLight` |
| `#SVGNeverRendered`        | 非レンダリング要素       | `svg\|clipPath`, `svg\|defs`, `svg\|mask`, `svg\|symbol`       |
| `#SVGPaintServer`          | ペイントサーバ要素       | `svg\|linearGradient`, `svg\|pattern`, `svg\|radialGradient`   |
| `#SVGRenderable`           | レンダリング可能要素     | `svg\|a`, `svg\|g`, `svg\|svg`, `svg\|text`, `svg\|use`        |
| `#SVGShape`                | シェイプ要素             | `svg\|circle`, `svg\|path`, `svg\|rect`, `svg\|line`           |
| `#SVGStructural`           | 構造要素                 | `svg\|defs`, `svg\|g`, `svg\|svg`, `svg\|symbol`, `svg\|use`   |
| `#SVGStructurallyExternal` | 外部構造要素             | (現在空)                                                       |
| `#SVGTextContent`          | テキストコンテンツ要素   | `svg\|text`, `svg\|textPath`, `svg\|tspan`                     |
| `#SVGTextContentChild`     | テキストコンテンツ子要素 | `svg\|textPath`, `svg\|tref`, `svg\|tspan`                     |

---

## 共通定義ファイル

### `spec-common.attributes.json`

19 個のグローバル属性カテゴリの定義ファイルです。各カテゴリはキーに `#` プレフィックス付きの名前を持ち、値は属性名から属性定義へのマッピングです。

```jsonc
{
  "#HTMLGlobalAttrs": {
    "accesskey": {
      "type": {
        "token": "OneCodePointChar",
        "ordered": true,
        "unique": true,
        "number": "zeroOrMore",
        "separator": "space",
      },
    },
    "autocapitalize": {
      "type": {
        "enum": ["off", "on", "none", "sentences", "words", "characters"],
        "invalidValueDefault": "sentences",
        "missingValueDefault": "default",
      },
    },
    "autofocus": {
      "type": "Boolean",
    },
    // ... 他の属性
  },
  "#GlobalEventAttrs": {
    /* ... */
  },
  "#ARIAAttrs": {
    /* ... */
  },
  // ... 他のカテゴリ
}
```

要素仕様の `globalAttrs` フィールドでカテゴリ名を参照し、`true`（全属性）、`false`（除外）、または文字列配列（選択的インクルード）で使用方法を指定します。

### `spec-common.contents.json`

コンテンツモデルカテゴリマクロの定義ファイルです。`models` キーの下にカテゴリ名と所属要素の配列が定義されます。

```jsonc
{
  "models": {
    "#metadata": ["base", "link", "meta", "noscript", "script", "style", "template", "title"],
    "#flow": ["a", "abbr", "address", "article", "aside", /* ... */ "#custom", "#text"],
    "#sectioning": ["article", "aside", "nav", "section"],
    "#SVGAnimation": ["svg|animate", "svg|animateMotion", "svg|set" /* ... */],
    "#SVGBasicShapes": ["svg|circle", "svg|ellipse", "svg|line", "svg|polygon", "svg|polyline", "svg|rect"],
    // ... 他のカテゴリ
  },
}
```

---

## 例

### 最小限の要素（`<p>`）

```jsonc
// https://html.spec.whatwg.org/multipage/grouping-content.html#the-p-element
{
  "contentModel": {
    "contents": [
      {
        "oneOrMore": ":model(phrasing)",
      },
    ],
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
  },
  "attributes": {},
  "aria": {
    "implicitRole": "paragraph",
    "permittedRoles": true,
    "namingProhibited": true,
    "1.1": {
      "implicitRole": false,
    },
  },
}
```

`<p>` 要素はフレージングコンテンツを 1 つ以上含むことができます。標準の HTML グローバル属性、イベント属性、ARIA 属性を持ち、要素固有の属性はありません。暗黙のロールは `paragraph` ですが、ARIA 1.1 ではロールが定義されていません。

### 複雑な要素（`<a>`）

```jsonc
// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element
{
  "contentModel": {
    "contents": [
      {
        "transparent": ":not(:model(interactive), a, [tabindex], :has(:model(interactive), a, [tabindex]))",
      },
    ],
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#HTMLLinkAndFetchingAttrs": ["href", "target", "download", "ping", "rel", "hreflang", "type", "referrerpolicy"],
  },
  "attributes": {},
  "aria": {
    "implicitRole": "link",
    "permittedRoles": [
      "button",
      "checkbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "switch",
      "tab",
      "treeitem",
    ],
    "properties": {
      "global": true,
      "role": true,
      "without": [
        {
          "type": "not-recommended",
          "name": "aria-disabled",
          "value": "true",
          "alt": {
            "method": "remove-attr",
            "target": "href",
          },
        },
      ],
    },
    "conditions": {
      ":not([href])": {
        "implicitRole": "generic",
        "permittedRoles": true,
        "namingProhibited": true,
      },
    },
    "1.1": {
      "conditions": {
        ":not([href])": {
          "implicitRole": false,
        },
      },
    },
  },
}
```

`<a>` 要素は透過コンテンツモデルを持ち、インタラクティブコンテンツと `<a>` 自身を除いた親のコンテンツモデルを継承します。`#HTMLLinkAndFetchingAttrs` カテゴリから選択的に属性をインクルードしています。`href` 属性の有無で暗黙ロールが変化する条件付き ARIA 定義があります。

### 条件付きコンテンツモデル（`<div>`）

```jsonc
// https://html.spec.whatwg.org/multipage/grouping-content.html#the-div-element
{
  "contentModel": {
    "contents": [
      {
        "oneOrMore": ":model(flow)",
      },
    ],
    "conditional": [
      {
        "condition": "dl > div",
        "contents": [
          {
            "oneOrMore": [
              { "zeroOrMore": ":model(script-supporting)" },
              { "oneOrMore": "dt" },
              { "zeroOrMore": ":model(script-supporting)" },
              { "oneOrMore": "dd" },
              { "zeroOrMore": ":model(script-supporting)" },
            ],
          },
        ],
      },
    ],
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
  },
  "attributes": {},
  "aria": {
    "implicitRole": "generic",
    "permittedRoles": true,
    "namingProhibited": true,
    "conditions": {
      "dl > div": {
        "permittedRoles": ["presentation", "none"],
      },
    },
    "1.1": {
      "implicitRole": false,
      "permittedRoles": true,
    },
  },
}
```

`<div>` 要素は通常フローコンテンツを許可しますが、`<dl>` の直接の子として使用される場合は `<dt>` と `<dd>` のペアのみを許可します。ARIA マッピングも同様にコンテキスト依存で、`<dl>` 内では `presentation` と `none` ロールのみが許可されます。

### SVG 要素（`<svg:text>`）

```jsonc
// https://svgwg.org/svg2-draft/text.html#TextElement
{
  "contentModel": {
    "contents": [
      {
        "zeroOrMore": [
          "#text",
          ":model(SVGAnimation)",
          ":model(SVGDescriptive)",
          ":model(SVGPaintServer)",
          ":model(SVGTextContentChild)",
          "svg|a",
          "svg|clipPath",
          "svg|marker",
          "svg|mask",
          "svg|script",
          "svg|style",
        ],
      },
    ],
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#SVGConditionalProcessingAttrs": ["requiredExtensions", "systemLanguage"],
    "#SVGCoreAttrs": ["id", "tabindex", "autofocus", "lang", "xml:space", "class", "style"],
    "#SVGPresentationAttrs": [
      "alignment-baseline",
      "baseline-shift",
      "fill",
      "font-family",
      "font-size",
      "opacity",
      "stroke",
      "text-anchor",
      "transform",
      // ... 他のプレゼンテーション属性
    ],
  },
  "attributes": {
    "lengthAdjust": {
      "type": {
        "enum": ["spacing", "spacingAndGlyphs"],
        "disallowToSurroundBySpaces": false,
      },
      "defaultValue": "spacing",
      "animatable": true,
    },
    "x": {
      "type": "<text-coordinate>",
      "defaultValue": "0",
      "animatable": true,
    },
    "y": {
      "type": "<text-coordinate>",
      "defaultValue": "0",
      "animatable": true,
    },
    "dx": { "type": "<text-coordinate>", "animatable": true },
    "dy": { "type": "<text-coordinate>", "animatable": true },
    "rotate": { "type": "<list-of-numbers>", "animatable": true },
    "textLength": {
      "type": ["<svg-length>", "<percentage>"],
      "animatable": true,
    },
  },
  "aria": {
    "implicitRole": "group",
    "permittedRoles": {
      "core-aam": true,
      "graphics-aam": true,
    },
  },
}
```

SVG 要素は HTML 要素と比較して以下の特徴があります。

- **コンテンツモデル**: SVG カテゴリ（`:model(SVGAnimation)` 等）とパイプ記法による名前空間指定（`svg|a`）を使用
- **グローバル属性**: SVG 固有のカテゴリ（`#SVGCoreAttrs`, `#SVGPresentationAttrs` 等）を選択的にインクルード
- **属性**: SVG/CSS 型（`<text-coordinate>`, `<svg-length>` 等）と `animatable` フラグを使用
- **ARIA**: `permittedRoles` で AAM 参照オブジェクト（`core-aam`, `graphics-aam`）を使用

### void 要素（`<input>` -- 簡略版）

```jsonc
// https://html.spec.whatwg.org/multipage/input.html#the-input-element
{
  "contentModel": {
    "contents": false,
  },
  "globalAttrs": {
    "#HTMLGlobalAttrs": true,
    "#GlobalEventAttrs": true,
    "#ARIAAttrs": true,
    "#HTMLEmbededAndMediaContentAttrs": ["src", "height", "width"],
    "#HTMLFormControlElementAttrs": [
      "autocomplete",
      "dirname",
      "disabled",
      "form",
      "formaction",
      "formenctype",
      "formmethod",
      "formnovalidate",
      "formtarget",
      "name",
      "maxlength",
      "minlength",
      "readonly",
      "required",
    ],
  },
  "attributes": {
    "accept": {
      "type": {
        "token": "Accept",
        "caseInsensitive": true,
        "unique": true,
        "separator": "comma",
      },
      "condition": "[type='file' i]",
    },
    "checked": {
      "type": "Boolean",
      "condition": ["[type='checkbox' i]", "[type='radio' i]"],
    },
    "max": {
      "type": ["DateTime", "Number"],
      "condition": [
        "[type='date' i]",
        "[type='month' i]",
        "[type='week' i]",
        "[type='time' i]",
        "[type='datetime-local' i]",
        "[type='number' i]",
        "[type='range' i]",
      ],
    },
    "multiple": {
      "type": "Boolean",
      "condition": ["[type='email' i]", "[type='file' i]"],
    },
    // ... 他の属性（実際のファイルには多数の属性定義が含まれる）
  },
  "aria": {
    // ... type 属性の値に応じた複雑な条件付き ARIA マッピング
  },
}
```

`<input>` 要素は void 要素であり、`contents: false` でコンテンツを持てないことを示しています。複数のグローバル属性カテゴリから選択的に属性をインクルードし、要素固有の属性は `condition` フィールドで `type` 属性の値に応じた条件付き定義を持ちます。

---

## まとめ

要素仕様 JSON ファイルの主要なパターンを以下にまとめます。

| パターン               | フィールド                   | 使用場面                      |
| ---------------------- | ---------------------------- | ----------------------------- |
| void 要素              | `contents: false`            | `<input>`, `<br>`, `<img>` 等 |
| 透過コンテンツ         | `transparent` + 除外セレクタ | `<a>`, `<del>`, `<ins>` 等    |
| 条件付きコンテンツ     | `conditional` 配列           | `<div>`（`<dl>` 内）等        |
| 選択的属性インクルード | `globalAttrs` で文字列配列   | `<a>`、`<input>` 等           |
| 条件付き属性           | `condition` フィールド       | `<input>` の type 依存属性    |
| 条件付き ARIA          | `conditions` オブジェクト    | `<a>` の href 依存ロール      |
| バージョン固有 ARIA    | `"1.1"`, `"1.2"` キー        | ARIA バージョン間の差異       |
| SVG 名前空間           | `svg\|` プレフィックス       | SVG 要素のコンテンツモデル    |
| カテゴリ参照           | `:model()` 擬似クラス        | コンテンツモデルパターン      |
