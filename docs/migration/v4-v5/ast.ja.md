# AST 破壊的変更: v4 から v5 への移行ガイド

## 対象読者

- `MLParser` インターフェースを実装する**パーサープラグイン開発者**
- AST レベルのトークンプロパティに直接アクセスする**カスタムルール作成者**

> **カスタムルール作成者へ**: DOM レイヤー（`MLElement`、`MLToken` など）のみを使用している場合、コードへの**影響はありません**。DOM レイヤーの公開 API に変更はありません。詳細は「[DOM レイヤーへの影響](#dom-レイヤーへの影響)」を参照してください。

## 変更一覧

| 変更内容 | 影響範囲 |
|---------|---------|
| トークン位置プロパティのリネーム | パーサープラグイン |
| 終了位置プロパティの削除 | パーサープラグイン |
| `selfClosingSolidus` の削除 | パーサープラグイン |
| `conditionalType` を `blockBehavior` に置換 | パーサープラグイン |
| `MLMarkupLanguageParser` / `Parse` 型の削除 | パーサープラグイン |
| `getNamespace` を `@markuplint/parser-utils` に移動 | パーサープラグイン |

## トークン位置プロパティ

`MLASTToken` の位置プロパティが簡素化されました。

### リネームされたプロパティ

| v4 | v5 |
|----|-----|
| `startOffset` | `offset` |
| `startLine` | `line` |
| `startCol` | `col` |

### 削除されたプロパティ

`endOffset`、`endLine`、`endCol` は `MLASTToken` から削除されました。開始位置と `raw` 文字列から導出します:

```ts
// v4
const end = token.endOffset;

// v5
const end = token.offset + token.raw.length;
```

行・列の取得には `@markuplint/parser-utils` のヘルパーを使用します:

```ts
import { getEndLine, getEndCol, getEndPosition } from '@markuplint/parser-utils/location';

const endLine = getEndLine(token.raw, token.line);
const endCol = getEndCol(token.raw, token.col);

// まとめて取得する場合:
const { endOffset, endLine, endCol } = getEndPosition(token.raw, token.offset, token.line, token.col);
```

## `selfClosingSolidus` の削除

`MLASTElement.selfClosingSolidus` は削除されました。代わりに `tagCloseChar` を使用します:

```ts
// v4
if (element.selfClosingSolidus) {
  // 自己閉じ要素
}

// v5
if (element.tagCloseChar.startsWith('/')) {
  // 自己閉じ要素（tagCloseChar は "/>"）
}
```

## `conditionalType` から `blockBehavior` への変更

`MLASTPreprocessorSpecificBlock.conditionalType` は `blockBehavior` に置き換えられました。`blockBehavior` は `MLASTElement` でも利用可能です。

```ts
// v4
if (block.conditionalType === 'if:else') {
  // ...
}

// v5
if (block.blockBehavior?.type === 'if:else') {
  // ...
}
```

`blockBehavior` は `type` と `expression` を持つオブジェクトです:

```ts
interface MLASTBlockBehavior {
  readonly type: MLASTBlockBehaviorType;
  readonly expression: string;
}
```

## `MLMarkupLanguageParser` / `Parse` 型の削除

レガシーの `MLMarkupLanguageParser` 型と `Parse` 型は削除されました。`MLParser` インターフェースを使用してください:

```ts
// v4
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';

const parser: MLMarkupLanguageParser = { ... };

// v5
import type { MLParser } from '@markuplint/ml-ast';

const parser: MLParser = { ... };
```

## `getNamespace` の `@markuplint/parser-utils` への移動

`getNamespace()` 関数は `@markuplint/html-parser` から削除され、`@markuplint/parser-utils` に集約されました。関数のシグネチャも、生の文字列ではなく AST ノードを使用するように変更されています。

```ts
// v4
import { getNamespace } from '@markuplint/html-parser';

const ns = getNamespace(tagName, parentNamespace);

// v5
import { getNamespace } from '@markuplint/parser-utils';

const ns = getNamespace(currentNodeName, parentNode);
```

| | v4 | v5 |
|---|---|---|
| パッケージ | `@markuplint/html-parser` | `@markuplint/parser-utils` |
| 第1引数 | `tagName: string` | `currentNodeName: string \| null` |
| 第2引数 | `parentNamespace?: string` | `parentNode: MLASTParentNode \| null` |

`@markuplint/html-parser` から `getNamespace` をインポートしていたカスタムパーサーは、インポートパスと呼び出し箇所を更新する必要があります。`@markuplint/parser-utils` の基底 `Parser` クラスが名前空間検出を自動的に処理するようになったため、ほとんどのパーサーでは `getNamespace` を直接呼び出す必要がなくなりました。

## DOM レイヤーへの影響

**DOM レイヤーの公開 API（`MLToken`、`MLElement` など）に変更はありません。** 以下のゲッターは引き続き利用可能です:

- `startLine`、`startCol`、`startOffset`
- `endLine`、`endCol`、`endOffset`
- `raw`、`fixed`

カスタムルールで DOM レイヤーのみを使用している場合、変更は不要です。
