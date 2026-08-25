# `no-redundant-accessible-name`

[Accessible Name and Description Computation (AccName) 1.2](https://www.w3.org/TR/accname-1.2/) アルゴリズムに基づき、**複数のアクセシブル名ソース**が存在し、高優先度のソースが低優先度のソースを上書きしている要素を検出します。

1つの要素に複数の命名メカニズムが存在する場合、最も優先度の高いソースのみが使用されます。上書きされたソースはデッドコードとなり、開発者がその要素のアクセシブル名を提供していると誤解する可能性があります。

例えば、`<label>` に「名前」と記載しつつ `aria-labelledby` で別の要素を参照した場合、目の見えるユーザーには「名前」と表示されますが、スクリーンリーダーには別の名前が伝わります。この不一致は [WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html) 違反となり、支援技術のユーザーに混乱を引き起こします。

> [!WARNING]
> デフォルトの重大度は `warning` です。

## 優先順位

AccName 1.2 アルゴリズムは以下の優先順位でアクセシブル名を解決します:

| 優先度 | ソース             | AccName ステップ                                                  | 例                                 |
| ------ | ------------------ | ----------------------------------------------------------------- | ---------------------------------- |
| 1      | `aria-labelledby`  | [2B](https://www.w3.org/TR/accname-1.2/#comp_labelledby)          | `<input aria-labelledby="ref">`    |
| 2      | `aria-label`       | [2C](https://www.w3.org/TR/accname-1.2/#comp_aria_label)          | `<input aria-label="Name">`        |
| 3      | `<label>`          | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<label for="x">Name</label>`      |
| 4      | `alt`              | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<img alt="Photo">`                |
| 5      | テキストコンテンツ | [2F](https://www.w3.org/TR/accname-1.2/#comp_name_from_content)   | `<button>Click</button>`           |
| 6      | `value`            | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<input type="submit" value="Go">` |
| 7      | `<legend>`         | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<fieldset><legend>Group</legend>` |
| 8      | `<caption>`        | [2D](https://www.w3.org/TR/accname-1.2/#comp_host_language_label) | `<table><caption>Title</caption>`  |
| 9\*    | `title`            | [2I](https://www.w3.org/TR/accname-1.2/#comp_tooltip)             | `<input title="Hint">`             |
| 10\*   | `placeholder`      | [2I](https://www.w3.org/TR/accname-1.2/#comp_tooltip)             | `<input placeholder="Hint">`       |

\* 対応するオプションが有効な場合のみチェックされます。

> **注意:** このテーブルは本ルールの検出優先度を示しています。同じ AccName ステップに属するソース（例: `label`、`alt`、`legend`、`caption` はすべて Step 2D）は、典型的な適用範囲に基づいて順序付けされており、アルゴリズムの厳密な優先順位とは異なります。

## ルール詳細

### :x: 不正

```html
<!-- aria-labelledby が label を上書き -->
<label for="name">名前</label>
<span id="other-label">別の名前</span>
<input id="name" type="text" aria-labelledby="other-label" />

<!-- aria-label がボタンのテキストコンテンツを上書き -->
<button aria-label="ダイアログを閉じる"><img src="x.svg" alt="" /> 閉じる</button>

<!-- aria-label が alt を上書き -->
<img alt="夕焼けの写真" aria-label="装飾画像" />

<!-- aria-label が legend を上書き -->
<fieldset aria-label="上書き">
  <legend>連絡先情報</legend>
</fieldset>
```

### :o: 正しい

```html
<!-- 単一ソース: label のみ -->
<label for="name">名前</label>
<input id="name" type="text" />

<!-- 単一ソース: コンテンツのみ -->
<button>送信</button>

<!-- 単一ソース: alt のみ -->
<img alt="夕焼けの写真" />

<!-- 単一ソース: aria-label のみ（他のソースなし） -->
<input type="text" aria-label="検索" />
```

## WCAG 2.5.3: Label in Name との関連

`aria-label` が視覚的なラベルと異なる文字列を提供する場合、[WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html) 違反となる可能性があります。この達成基準では、アクセシブル名に視覚的なラベルテキストを含めることが求められます。不一致する文字列による冗長な上書きはこの要件を破ります。

本ルールは上書き自体を検出することで、このような不一致を早期に発見する助けとなります。

## オプション

### `checkTitleFallback`

型: `boolean`
デフォルト: `false`

`true` の場合、`title` 属性を冗長性チェックに含めます。デフォルトでは、`title` は AccName アルゴリズムにおける最終手段のフォールバックであるため無視されます。

```json
{
  "no-redundant-accessible-name": {
    "options": {
      "checkTitleFallback": true
    }
  }
}
```

### `checkPlaceholderFallback`

型: `boolean`
デフォルト: `false`

`true` の場合、`placeholder` 属性を冗長性チェックに含めます。デフォルトでは、`placeholder` は最終手段のフォールバックであるため無視されます。

```json
{
  "no-redundant-accessible-name": {
    "options": {
      "checkPlaceholderFallback": true
    }
  }
}
```

## 特定の要素を除外する

アイコンボタンなど、`aria-label` で意図的に名前を提供する正当なパターンの場合:

```json
{
  "nodeRules": [
    {
      "selector": "button:has(svg)",
      "rules": {
        "no-redundant-accessible-name": false
      }
    }
  ]
}
```

### `aria-labelledby` による意図的な上書き

`aria-labelledby` を使って `<label>` に追加コンテキストを組み合わせるパターンはよくある正当な用法です:

```html
<label for="email" id="lbl">メール</label>
<input id="email" aria-labelledby="lbl hint" />
<span id="hint">（必須）</span>
```

本ルールは `aria-labelledby` が `label` を上書きするため違反として報告します。このパターンの警告を抑制するには:

```json
{
  "nodeRules": [
    {
      "selector": "input[aria-labelledby]",
      "rules": {
        "no-redundant-accessible-name": false
      }
    }
  ]
}
```

## 既知の制限事項

- **CSS 生成コンテンツ**: `::before` / `::after` 疑似要素からのコンテンツは静的解析では検出できず、名前ソースのチェックに含まれません。
- **SVG `<title>`**: SVG の `<title>` 子要素は SVG 要素のアクセシブル名を提供しますが、HTML の `title` 属性とは異なり、本ルールでは現在対象外です。
- **`aria-describedby`**: 本ルールはアクセシブル「名前」ソースのみをチェックします。アクセシブル「説明」（`aria-describedby`）は別の概念であり、対象外です。

## 関連

- [Issue #1478](https://github.com/markuplint/markuplint/issues/1478)
- [`require-accessible-name`](../require-accessible-name/README.md)
- [`wai-aria`](../wai-aria/README.md)
- [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/)
- [WCAG 2.5.3: Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html)
