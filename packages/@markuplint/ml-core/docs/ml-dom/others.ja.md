# その他のノード型

MLBlock のドキュメントは専用の [MLBlock](./block.ja.md) リファレンスを参照してください。

## MLCharacterData（抽象）

**ソース:** `src/ml-dom/node/character-data.ts`

テキストコンテンツノードの抽象基底クラスです。DOM `CharacterData` インターフェースを実装します。

| プロパティ               | 型                  | 説明                                    |
| ------------------------ | ------------------- | --------------------------------------- |
| `data`                   | `string`            | 文字データの内容（現在は `raw` を返す） |
| `nodeValue`              | `string \| null`    | `data` と同じ                           |
| `textContent`            | `string`            | `data` と同じ                           |
| `nextElementSibling`     | `MLElement \| null` | 次の兄弟要素                            |
| `previousElementSibling` | `MLElement \| null` | 前の兄弟要素                            |

メソッド: `after()`、`before()`、`remove()`、`replaceWith()`。

## MLText

**ソース:** `src/ml-dom/node/text.ts`

テキストノードです。`MLCharacterData` を継承し、DOM `Text` を実装します。

- `nodeName`: `'#text'`
- `nodeType`: `3`（`TEXT_NODE`）

| メソッド                    | 戻り値    | 説明                                               |
| --------------------------- | --------- | -------------------------------------------------- |
| `isWhitespace()`            | `boolean` | テキストが `/^\s+$/` にマッチする場合 `true`       |
| `isRawTextElementContent()` | `boolean` | 親要素が `<script>` または `<style>` の場合 `true` |

## MLComment

**ソース:** `src/ml-dom/node/comment.ts`

コメントノードです。`MLCharacterData` を継承し、DOM `Comment` を実装します。

- `nodeName`: `'#comment'`
- `nodeType`: `8`（`COMMENT_NODE`）
- `textContent`: コメントの `data` を返す

## MLDocumentType

**ソース:** `src/ml-dom/node/document-type.ts`

DOCTYPE ノードです。`MLNode` を継承し、DOM `DocumentType` を実装します。

- `nodeType`: `10`（`DOCUMENT_TYPE_NODE`）
- `nodeName`: `name` と同じ
- `textContent`: 常に `null`

| プロパティ | 型       | 説明                                 |
| ---------- | -------- | ------------------------------------ |
| `name`     | `string` | ドキュメントタイプ名（例: `"html"`） |
| `publicId` | `string` | パブリック識別子、または空文字列     |
| `systemId` | `string` | システム識別子、または空文字列       |

## MLElementCloseTag

**ソース:** `src/ml-dom/node/element-close-tag.ts`

対応する開始タグ要素とペアになる閉じタグです。`MLNode` を継承します。閉じタグはドキュメントの `nodeList` の一部**ではなく**、ペアの `MLElement` のサテライトとしてのみ存在します。

MLElementCloseTag は2つの目的で存在します：

1. **構文位置の追跡**: 閉じタグのソース位置（`startLine`、`startCol`、`raw` など）を記録します。`case-sensitive-tag-name` のようなルールは、開始タグではなく閉じタグの正確な位置で違反を報告するためにこれを使用します。
2. **存在の有無の検出**: 閉じタグが存在しない場合、`MLElement.closeTag` は `null` になります。`end-tag` のようなルールは `el.closeTag != null` で非 void 要素の閉じタグの欠落（省略や漏れ）を検出します。

### プロパティ

| プロパティ | 型          | 説明                                            |
| ---------- | ----------- | ----------------------------------------------- |
| `pair`     | `MLElement` | 対応する開始要素                                |
| `rawName`  | `string`    | ソースに記述されたタグ名（AST `nodeName` から） |
| `nodeName` | `string`    | ペアの要素の `nodeName` から導出されたタグ名    |

### ルールでの使用例

```typescript
// end-tag ルール: 閉じタグの欠落を検出
if (el.closeTag != null) {
  return; // 閉じタグが存在する → OK
}
report({ scope: el, message: t('Missing {0}', t('the {0}', 'end tag')) });

// case-sensitive-tag-name ルール: 閉じタグのソース位置でレポート
const closeTag = el.closeTag;
if (closeTag && deny.test(closeTag.raw)) {
  report({
    scope: {
      rule: el.rule,
      startLine: closeTag.startLine,
      startCol: closeTag.startCol,
      raw: closeTag.raw,
    },
    message,
  });
}
```

### `toString(fixed?)`

`fixed=true` の場合：

- 要素が仮想要素（`#` で始まる）または省略された要素 → `raw` を返す
- それ以外：ペアの区切り文字を使って `tagOpenChar` + `/` + タグ名 + `tagCloseChar` を再構築する。タグ名は `pair.fixedNodeName === pair.rawName`（修正なし）の場合は `this.rawName` を使い、それ以外は `pair.fixedNodeName` を使う

## MLDocumentFragment

**ソース:** `src/ml-dom/node/document-fragment.ts`

JSX フラグメント（`<>...</>`）や同様の構文のフラグメントルートノードです。`MLParentNode` を継承し、DOM `DocumentFragment` を実装します。

- `nodeName`: `'#document-fragment'`
- `nodeType`: `11`（`DOCUMENT_FRAGMENT_NODE`）
- `textContent`: すべての子ノードのテキストコンテンツの連結
