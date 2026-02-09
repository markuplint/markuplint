# MLAttr

**ソース:** `src/ml-dom/node/attr.ts`

属性ノードです。`MLNode` を継承し、DOM `Attr` インターフェースを実装します。各属性は細粒度の検査と修正のために個々のトークンに分解されます。

## プロパティ

| プロパティ     | 型               | 説明                                               |
| -------------- | ---------------- | -------------------------------------------------- |
| `name`         | `string`         | 修飾された属性名（`#potentialName` から解決）      |
| `localName`    | `string`         | 属性名のローカル部分（名前空間プレフィックスなし） |
| `namespaceURI` | `string \| null` | 属性の名前空間 URI                                 |
| `value`        | `string`         | 属性値（`#potentialValue` から解決）               |
| `nodeValue`    | `string`         | `value` と同じ                                     |
| `textContent`  | `string`         | `value` と同じ                                     |
| `specified`    | `true`           | 常に `true`（DOM `Attr` インターフェース要件）     |
| `ownerElement` | `MLElement`      | この属性を所有する要素                             |

## `#potentialName` / `#potentialValue`

パーサーは、ソース構文が有効なセマンティクスと異なる属性に対して、解決済みの「potential」名と値を提供する場合があります。例えば、テンプレートエンジンが属性名や値を変換することがあります。

- `astToken.potentialName` が存在する場合 → `name` として使用する。そうでなければ `nameNode.raw` を使用する
- `astToken.potentialValue` が存在する場合 → `value` として使用する。そうでなければ `valueNode.raw` を使用する

## トークン分解

各属性は個々の `MLToken` インスタンスに分解されます：

```
 ·class="container"
 ^     ^^         ^
 |     ||         └── endQuote (raw: '"')
 |     |└── valueNode (raw: 'container')
 |     └── startQuote (raw: '"')
 |        equal (raw: '=')
 └── spacesBeforeName (raw: ' ')
    nameNode (raw: 'class')
```

| トークンプロパティ  | 型                | 説明                                          |
| ------------------- | ----------------- | --------------------------------------------- |
| `spacesBeforeName`  | `MLToken \| null` | 属性名の前の空白                              |
| `nameNode`          | `MLToken \| null` | 属性名トークン（スプレッド属性の場合は null） |
| `spacesBeforeEqual` | `MLToken \| null` | 名前と `=` の間の空白                         |
| `equal`             | `MLToken \| null` | `=` 記号トークン                              |
| `spacesAfterEqual`  | `MLToken \| null` | `=` と値の間の空白                            |
| `startQuote`        | `MLToken \| null` | 開始引用符トークン                            |
| `valueNode`         | `MLToken \| null` | 属性値トークン                                |
| `endQuote`          | `MLToken \| null` | 終了引用符トークン                            |

## スプレッド属性

スプレッド属性（例：JSX の `{...props}`）の場合、`MLAttr` は最小限のプロパティで作成されます：

| プロパティ                 | 値                           |
| -------------------------- | ---------------------------- |
| `localName`                | `'#spread'`                  |
| `valueType`                | `'code'`                     |
| `isDirective`              | `true`                       |
| `isDynamicValue`           | `true`                       |
| `isDuplicatable`           | `true`                       |
| すべてのトークンプロパティ | `null`                       |
| `fix()`                    | No-op（即座に return）       |
| `value`                    | スプレッド式のソーステキスト |

## `tokenList`（MLDomTokenList）

スペース区切りの属性値（例：`class` 属性）に対する `MLDomTokenList` を返します：

- `isDynamicValue` の場合 → `null` を返す（動的式はトークン化できない）
- それ以外の場合 → `new MLDomTokenList(this.value, [this])`

## `rule` ゲッター

`ownerElement.rule` に委譲します -- 属性はそれを所有する要素からルール設定を継承します。

## メタデータプロパティ

| プロパティ       | 型                                            | 説明                                         |
| ---------------- | --------------------------------------------- | -------------------------------------------- |
| `isDynamicValue` | `true \| undefined`                           | 値に動的式が含まれているかどうか             |
| `isDirective`    | `true \| undefined`                           | 属性がフレームワークのディレクティブかどうか |
| `isDuplicatable` | `boolean`                                     | 属性が複数回出現可能かどうか                 |
| `valueType`      | `'string' \| 'number' \| 'boolean' \| 'code'` | 値の型分類                                   |
| `candidate`      | `string \| undefined`                         | パーサーが提案する修正候補値                 |

## メソッド

| メソッド            | シグネチャ                          | 説明                                                                                 |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `fix`               | `fix(raw: string): void`            | `valueNode` の修正済みコンテンツを更新する。スプレッド属性の場合は No-op             |
| `toNormalizeString` | `toNormalizeString(): string`       | 余分な空白を除去した正規化された表現                                                 |
| `toString`          | `toString(fixed?: boolean): string` | raw または fixed の文字列。`fixed=true` の場合、各トークンの修正済み値から再構築する |
