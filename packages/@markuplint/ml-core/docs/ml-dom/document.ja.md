# MLDocument

**ソース:** `src/ml-dom/node/document.ts`

MLDOM ツリーのルートノードです。`MLParentNode` を継承し、DOM `Document` インターフェースを実装します。

## コンストラクション

コンストラクタは以下を受け取ります：

1. `ast: MLASTDocument` -- パース済みの AST ドキュメント
2. `ruleset: Ruleset` -- ルール設定
3. `schemas: MLSchema` -- HTML/ARIA 仕様データ（タプル）
4. `options?` -- オプション設定：
   - `filename` -- ソースファイルパス
   - `endTag` -- `'xml'` | `'omittable'` | `'never'`（デフォルト: `'omittable'`）
   - `booleanish` -- 省略された boolean 風属性を `true` として扱う（デフォルト: `false`）
   - `tagNameCaseSensitive` -- タグ名の大文字小文字を区別する比較（デフォルト: `false`）
   - `pretenders` -- pretender 定義の配列

コンストラクション手順：

1. AST `nodeList` を反復して各非 endtag ノードに対して `createNode()` を呼び出し、フラットな `nodeList` を構築してから配列をフリーズする
2. すべての要素ノードに対して `_pretending(pretenders)` で pretender コンテキストを初期化する
3. `RuleMapper` を使って `_ruleMapping(ruleset)` でルール設定をノードに配布する

## `_pretending(pretenders?)`

`nodeList` 内のすべての要素ノードを反復し、各要素に対して `element.pretending(pretenders)` を呼び出します。詳細は [MLElement > Pretender システム](./element.ja.md#pretender-システム)を参照してください。

## `_ruleMapping(ruleset)`

`RuleMapper` を使って `Ruleset` からのルールを個々のノードに配布します。マッピングは3つのレイヤーで行われ、詳細度が増す順に適用されます：

1. **グローバルルール**（`ruleset.rules`）：`#document` と `nodeList` 内のすべてのノードに詳細度 `[0, 0, 0]` で適用
2. **ノードルール**（`ruleset.nodeRules`）：各 `nodeRule` に対して、`matchMLSelector()` でセレクタを要素にマッチさせる。マッチした場合、グローバルルールとマージしてセレクタの詳細度で適用
3. **子ノードルール**（`ruleset.childNodeRules`）：各 `childNodeRule` に対して、親セレクタをマッチさせ、直接の子（または `inheritance: true` の場合はすべての子孫）にマージしたルールを適用

`RuleMapper.set()` は CSS 詳細度の比較を使用します -- より高い詳細度のルールがより低い詳細度のルールを上書きします。`RuleMapper.apply()` は内部マップから解決されたルールを各ノードの `rules` レコードに転送します。

ルール解決の完全な詳細は [rule-system.md](../rule-system.md) を参照してください。

## 主要プロパティ

| プロパティ             | 型                         | 説明                                                              |
| ---------------------- | -------------------------- | ----------------------------------------------------------------- |
| `nodeList`             | `ReadonlyArray<MLNode>`    | ドキュメント順の全ノードのフリーズされたフラットリスト            |
| `specs`                | `MLMLSpec`                 | HTML/ARIA 仕様データ                                              |
| `isFragment`           | `boolean`                  | ドキュメントがフラグメントかどうか（ルート要素が不要）            |
| `currentRule`          | `Readonly<MLRule> \| null` | 現在評価中のルール、または `null`                                 |
| `endTag`               | `EndTagType`               | 終了タグの処理モード: `'xml'` \| `'omittable'` \| `'never'`       |
| `booleanish`           | `boolean`                  | boolean 風属性を boolean として扱うかどうか（デフォルト `false`） |
| `tagNameCaseSensitive` | `boolean`                  | タグ名の大文字小文字区別（デフォルト `false`）                    |
| `filename`             | `string \| undefined`      | ソースファイル名                                                  |
| `doctype`              | `MLDocumentType \| null`   | DOCTYPE ノード（存在する場合）。`nodeList` をスキャンして検出     |

## `walkOn(type, walker, skipWhenRuleIsDisabled?)`

`nodeList` に対して `sequentialWalker` を使い、特定の型のノードを走査します。

**パラメータ：**

- `type` -- 走査するノード型（下表参照）
- `walker` -- マッチしたノードを受け取るコールバック関数
- `skipWhenRuleIsDisabled` -- 現在のルールが無効化されているノードをスキップする（デフォルト: `true`）

| 型                  | 走査対象                                                            | walker パラメータ   |
| ------------------- | ------------------------------------------------------------------- | ------------------- |
| `'Element'`         | `nodeList` 内の `ELEMENT_NODE` ノード                               | `MLElement`         |
| `'Text'`            | `nodeList` 内の `TEXT_NODE` ノード                                  | `MLText`            |
| `'Comment'`         | `nodeList` 内の `COMMENT_NODE` ノード                               | `MLComment`         |
| `'Attr'`            | `nodeList` 内の各 `ELEMENT_NODE` のすべての属性                     | `MLAttr`            |
| `'ElementCloseTag'` | `nodeList` 内の各 `ELEMENT_NODE` の `closeTag`（`null` はスキップ） | `MLElementCloseTag` |

`skipWhenRuleIsDisabled` パラメータは現在のルールに対する `node.rule.disabled` をチェックします。`true` の場合、そのノードに対して walker は呼び出されません。これがルールがノードごとの無効化ディレクティブを尊重する仕組みです。

```typescript
// すべての要素を走査（デフォルトで無効化されたノードはスキップ）
await document.walkOn('Element', async element => {
  console.log(element.localName);
});

// 無効化されたノードを含むすべての属性を走査
await document.walkOn(
  'Attr',
  async attr => {
    console.log(`${attr.name}="${attr.value}"`);
  },
  false,
);
```

## `getAccessibilityProp(node, ariaVersion?)`

ノードの ARIA アクセシビリティプロパティを計算します。

**フロー：**

1. `node` が要素でない場合 → `null` を返す
2. 要素が `<slot>` の場合 → `{ unknown: true }` を返す（コンテンツは実行時に決定される）
3. `isExposed()` を呼び出して要素がアクセシビリティツリーに公開されているか判定する
4. 公開されていない場合 → `{ unknown: false, exposedToTree: false }` を返す
5. `getComputedRole()` で ARIA ロールを計算する
6. `getAccname()` でアクセシブル名を計算する（pretender コンテキストを含む -- [ヘルパー: accname](./helpers.ja.md#accname) を参照）
7. ロール定義から `nameRequired` と `nameProhibited` を判定する
8. `<slot>` の子要素をチェックする -- 存在する場合、名前が不明な可能性がある
9. `mayBeFocusable()` でフォーカス可能性を計算する
10. `getComputedAriaProps()` で計算された ARIA プロパティを収集する（必須 + 非デフォルトのプロパティ）

`AccessibilityProperties` を返します（[型ユーティリティ](./helpers.ja.md#型ユーティリティ)を参照）。

## `toString(fixed?)`

トークンリストからソースコードを再構築します。

- `fixed=false`（デフォルト）：元の `raw` 文字列を返す
- `fixed=true`：オフセット追跡による置換を適用する：
  1. `getTokenList()` を取得する（`startOffset` でソート済み）
  2. 各トークンに対して：`toString(true) !== raw` の場合、修正済みコンテンツを文字列にスプライスする
  3. 正確な位置を維持するために累積オフセット差を追跡する

## `defaultView`

`getComputedStyle()` を提供するモックウィンドウオブジェクトを返します。これは `getPropertyValue()` スタブを持つオブジェクトを返します。これは **Accessible Name and Description Computation** アルゴリズムのインターフェース要件を満たします。すべてのスタイルプロパティ値は空のオブジェクトを返します。

## その他のメソッド

| メソッド               | シグネチャ                                        | 説明                                                                                                 |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `setRule`              | `setRule(rule: MLRule \| null): void`             | 現在評価中のルールを設定/クリアする                                                                  |
| `getTokenList`         | `getTokenList(): ReadonlyArray<MLToken>`          | ソース再構築用のすべてのトークン。オフセットでソート済み（キャッシュ）。ノードと閉じタグの両方を含む |
| `searchNodeByLocation` | `searchNodeByLocation(line, col): MLNode \| null` | 1始まりのソース位置でノードを検索する                                                                |
| `debugMap`             | `debugMap(): string[]`                            | ドキュメントツリー構造のデバッグ出力                                                                 |

## endTag モード

| 値            | 動作                                                |
| ------------- | --------------------------------------------------- |
| `'omittable'` | HTML モード：特定の終了タグが省略可能（デフォルト） |
| `'xml'`       | XML モード：すべての要素に明示的な終了タグが必要    |
| `'never'`     | 終了タグなし（例: Pug, Slim）                       |
