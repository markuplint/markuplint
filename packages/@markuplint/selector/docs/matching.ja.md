# セレクタマッチング

`@markuplint/selector` の 2 つのセレクタマッチングシステムの詳細ドキュメント。

## 概要

このパッケージは 2 つの独立したマッチングシステムを提供します:

1. **CSS セレクタマッチング** -- `postcss-selector-parser` でパースされる標準 CSS セレクタ
2. **Regex セレクタマッチング** -- 正規表現を使用したパターンベースのマッチング

両システムとも詳細度情報を返し、統合関数 `matchSelector()` を通じて使用できます。

## CSS セレクタマッチングフロー

### 1. エントリーポイント

```
createSelector(selectorString, specs?)
  → new Selector(selectorString, extendedPseudoClasses)
    → Ruleset.parse(selectorString, extended)
      → postcss-selector-parser がセレクタ文字列を処理
      → parser.Selector[] AST ノードを返却
```

### 2. パース

`Ruleset.parse()` は `postcss-selector-parser` を使用してセレクタ文字列を AST にパースします。カンマ区切りの各セレクタは `parser.Selector` ノードになります。`Ruleset` は各ノードを `StructuredSelector` でラップします。

### 3. StructuredSelector チェーンの構築

各 `StructuredSelector` は AST ノードを走査し、コンビネータで連結された `SelectorTarget` オブジェクトのチェーンを構築します:

```
div > .class:not(.other) span
  → SelectorTarget("div") → 子コンビネータ →
    SelectorTarget(".class:not(.other)") → 子孫コンビネータ →
      SelectorTarget("span")
```

チェーンは AST から左から右に構築されますが、マッチングは右から左に行われます（現在の要素から開始）。

### 4. SelectorTarget マッチング

各 `SelectorTarget` は複合セレクタのコンポーネントを以下の順序でマッチングします:

1. **名前空間チェック** -- 存在する場合、要素の名前空間を検証（`svg` と `*` のみサポート）
2. **ID セレクタ**（`#id`）-- `el.id` にマッチ、詳細度 `[1, 0, 0]`
3. **タグセレクタ**（`div`）-- `el.localName` にマッチ（純粋な HTML 要素は大文字小文字非区別）、詳細度 `[0, 0, 1]`。ユニバーサルセレクタ（`*`）はタグ型として扱われますが、詳細度は加算されません。
4. **クラスセレクタ**（`.class`）-- `el.classList` にマッチ、詳細度 `[0, 1, 0]`
5. **属性セレクタ**（`[attr=val]`）-- 要素属性を演算子付きでマッチ、詳細度 `[0, 1, 0]`
6. **擬似クラス**（`:not()`、`:has()` 等）-- 専用ハンドラにディスパッチ

いずれかのコンポーネントがマッチに失敗すると、`SelectorTarget` 全体が失敗します（早期終了）。

### 5. コンビネータマッチング

`SelectorTarget` がマッチすると、`StructuredSelector` はコンビネータに従って次のターゲットへ進みます:

| コンビネータ | 記号            | DOM トラバーサル                          |
| ------------ | --------------- | ----------------------------------------- |
| 子孫         | ` `（スペース） | `parentElement` チェーンをたどる          |
| 子           | `>`             | 直接の `parentElement` を確認             |
| 隣接兄弟     | `+`             | `previousElementSibling` を確認           |
| 一般兄弟     | `~`             | `previousElementSibling` チェーンをたどる |

## 擬似クラスの処理

### 標準擬似クラス

| 擬似クラス         | 動作                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| `:not(selector)`   | 内部セレクタがマッチしない場合にマッチ。詳細度は内部セレクタに等しい。       |
| `:is(selector)`    | いずれかの内部セレクタがマッチすればマッチ。詳細度は最も高いマッチに等しい。 |
| `:where(selector)` | `:is()` と同じだが、常に `[0, 0, 0]` の詳細度。                              |
| `:has(selector)`   | 子孫（またはコンビネータ `+`/`~` で兄弟）がマッチすればマッチ。              |
| `:scope`           | スコープ要素にマッチ（スコープなしの場合はルート）。詳細度 `[0, 1, 0]`。     |
| `:root`            | `<html>` 要素にマッチ。詳細度 `[0, 1, 0]`。                                  |

### カスタム: `:closest(selector)`

祖先チェーンをたどり、いずれかの祖先が内部セレクタにマッチすればマッチします。これは W3C 仕様にない markuplint の拡張です。

### 拡張擬似クラス

拡張擬似クラスは `ExtendedPseudoClass` レジストリを通じてディスパッチされます:

#### `:aria(syntax)`

| 構文          | 動作                                                |
| ------------- | --------------------------------------------------- |
| `has name`    | `getAccname(el)` が空でない文字列を返す場合にマッチ |
| `has no name` | `getAccname(el)` が空文字列を返す場合にマッチ       |

バージョン構文をサポート: `:aria(has name|1.2)`（バージョンパラメータはパースされますが、フィルタリングにはまだ使用されていません）。

#### `:role(roleName)` / `:role(roleName|version)`

`getComputedRole(specs, el, version)` が返すロールの `name` が指定された `roleName` と一致する場合にマッチします。バージョンのデフォルトは `ARIA_RECOMMENDED_VERSION` です。

#### `:model(category)`

指定された HTML コンテンツモデルカテゴリに要素が属する場合にマッチします。`contentModelCategoryToTagNames()` を使用してカテゴリのマッチングセレクタリストを取得し、各セレクタを要素に対してテストします。

特殊ケース:

- `#custom` -- カスタム要素（`isCustomElement` プロパティを持つ要素）にマッチ
- `#text` -- 常にマッチしない（テキストノードは要素ではない）

## Regex セレクタマッチングフロー

### 1. エントリーポイント

```
matchSelector(el, regexSelector)
  → regexSelect(el, regexSelector)
    → combination リンクから SelectorTarget チェーンを構築
    → エッジ（最深の combination）からルートへ向かってマッチング
```

### 2. SelectorTarget チェーンの構築

`RegexSelector` 型はチェーンされた combination をサポートします:

```typescript
{
  nodeName: "/^div$/",
  combination: {
    combinator: ">",
    nodeName: "/^span$/",
    combination: {
      combinator: "+",
      attrName: "/^data-/"
    }
  }
}
```

これにより次のチェーンが構築されます: `SelectorTarget(div) → > → SelectorTarget(span) → + → SelectorTarget([data-*])`

### 3. パターンマッチング

`regexSelectorMatches(pattern, value, ignoreCase)` がパターンマッチングを処理します:

- **プレーン文字列**: `^pattern$` としてラップ（完全一致）
- **正規表現リテラル**（`/pattern/flags`）: 指定されたフラグでそのまま使用
- **大文字小文字の区別**: HTML 要素は大文字小文字を区別しないマッチングを使用（`isPureHTMLElement()` の場合 `ignoreCase = true`）

### 4. Regex コンビネータ

標準 CSS コンビネータに加え、2 つの追加コンビネータをサポートします:

| コンビネータ | 記号        | DOM トラバーサル                          |
| ------------ | ----------- | ----------------------------------------- |
| 子孫         | `' '`       | `parentElement` チェーンをたどる          |
| 子           | `'>'`       | 直接の `parentElement` を確認             |
| 隣接兄弟     | `'+'`       | `previousElementSibling` を確認           |
| 一般兄弟     | `'~'`       | `previousElementSibling` チェーンをたどる |
| 前方隣接兄弟 | `':has(+)'` | `nextElementSibling` を確認               |
| 前方一般兄弟 | `':has(~)'` | `nextElementSibling` チェーンをたどる     |

### 5. データキャプチャ

マッチした正規表現キャプチャグループは `data` オブジェクトに収集されます:

```typescript
// パターン: "/^(?<prefix>[a-z]+)-(?<suffix>[a-z]+)$/"
// 値: "data-value"
// 結果: { $0: "data-value", $1: "data", $2: "value", prefix: "data", suffix: "value" }
```

`nodeName` マッチングの `$0` キャプチャは削除されます（完全一致であり、要素名と冗長なため）。チェーン内の全ターゲットのデータはマージされます。

### 6. 詳細度の計算

Regex セレクタの詳細度はターゲットごとに計算されます:

- `nodeName` マッチ: `[0, 0, 1]`（タイプ詳細度）
- マッチした各属性: `[0, 1, 0]`（クラスレベル詳細度）
- 結合されたターゲットの詳細度は合算されます

## キャッシュ

`createSelector()` は `Map<string, Selector>` キャッシュを保持します。同じセレクタ文字列での後続の呼び出しは同じ `Selector` インスタンスを返し、`postcss-selector-parser` による繰り返しのパースを回避します。

## サポート対象・非対象セレクタ

### サポート対象

- ユニバーサル（`*`）、タイプ（`div`）、ID（`#id`）、クラス（`.class`）
- 全属性セレクタ演算子（`=`、`~=`、`|=`、`*=`、`^=`、`$=`、大文字小文字非区別 `i` フラグ）
- コンビネータ: 子孫（` `）、子（`>`）、隣接兄弟（`+`）、一般兄弟（`~`）
- 複数セレクタ（`,`）
- `:not()`、`:is()`、`:where()`、`:has()`、`:scope`、`:root`
- `:closest()`（markuplint 拡張）
- 拡張: `:aria()`、`:role()`、`:model()`
- 名前空間セレクタ（`svg|text`、`*|div`）。注: `svg` と `*` の名前空間のみサポート。他の名前空間（例: `html`）は `InvalidSelectorError` をスローします。

### 非サポート（エラーをスロー）

構造擬似クラス: `:empty`、`:nth-child()`、`:nth-last-child()`、`:first-child`、`:last-child`、`:only-child`、`:nth-of-type()`、`:nth-last-of-type()`、`:first-of-type`、`:last-of-type`、`:only-of-type`、`:nth-col()`、`:nth-last-col()`

入力擬似クラス: `:enable`、`:disable`、`:read-write`、`:read-only`、`:placeholder-shown`、`:default`、`:checked`、`:indeterminate`、`:valid`、`:invalid`、`:in-range`、`:out-of-range`、`:required`、`:optional`、`:blank`、`:user-invalid`

### 無視（エラーをスロー）

ユーザーインタラクション/動的擬似クラス: `:dir()`、`:lang()`、`:any-link`、`:link`、`:visited`、`:local-link`、`:target`、`:target-within`、`:current`、`:past`、`:future`、`:active`、`:hover`、`:focus`、`:focus-within`、`:focus-visible`

擬似要素: `::before`、`::after`

カラムコンビネータ: `||`
