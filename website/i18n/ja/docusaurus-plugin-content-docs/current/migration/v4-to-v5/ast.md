---
sidebar_position: 8
title: AST
---

# AST の変更

このページでは内部 AST レイヤーの破壊的変更について説明します。**パーサープラグイン開発者**や、AST レベルのトークンプロパティに直接アクセスする**カスタムルール作成者**が対象です。

:::tip カスタムルール作成者の方へ
DOM レイヤー（`MLElement`、`MLToken` など）のみを使用している場合は、**変更不要です**。DOM レイヤーの公開 API に変更はありません。後述の [DOM レイヤーへの影響](#dom-レイヤーへの影響)を参照してください。
:::

## 変更一覧

| 変更内容                                    | 影響範囲                 |
| ------------------------------------------- | ------------------------ |
| トークン位置プロパティのリネーム            | パーサープラグイン開発者 |
| 終了位置プロパティの削除                    | パーサープラグイン開発者 |
| `selfClosingSolidus` の削除                 | パーサープラグイン開発者 |
| `conditionalType` を `blockBehavior` に変更 | パーサープラグイン開発者 |
| `MLMarkupLanguageParser` / `Parse` 型の削除 | パーサープラグイン開発者 |
| `getNamespace` を `parser-utils` に移動     | パーサープラグイン開発者 |

## トークン位置プロパティのリネーム

`MLASTToken` の位置プロパティが簡素化されました。`start` プレフィックスが廃止されています。

| v4            | v5       |
| ------------- | -------- |
| `startOffset` | `offset` |
| `startLine`   | `line`   |
| `startCol`    | `col`    |

## 終了位置プロパティの削除

:::caution 破壊的変更
`endOffset`、`endLine`、`endCol` が `MLASTToken` から削除されました。
:::

代わりに開始位置と `raw` 文字列から計算してください。

**終了オフセット：**

```ts
// v4
const end = token.endOffset;

// v5
const end = token.offset + token.raw.length;
```

**終了行・列** -- `@markuplint/parser-utils` のヘルパーを使用します。

```ts
import { getEndLine, getEndCol, getEndPosition } from '@markuplint/parser-utils/location';

const endLine = getEndLine(token.raw, token.line);
const endCol = getEndCol(token.raw, token.col);

// まとめて取得する場合：
const { endOffset, endLine, endCol } = getEndPosition(token.raw, token.offset, token.line, token.col);
```

## `selfClosingSolidus` の削除

`selfClosingSolidus` の代わりに `tagCloseChar` を使用してください。

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

`conditionalType` は `blockBehavior` に置き換えられました。新しいプロパティは `type` と `expression` フィールドを持つオブジェクトです。`MLASTElement` でも利用可能です。

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

`blockBehavior` のインターフェース：

```ts
interface MLASTBlockBehavior {
  readonly type: MLASTBlockBehaviorType;
  readonly expression: string;
}
```

## `MLMarkupLanguageParser` 型の削除

レガシーの `MLMarkupLanguageParser` 型と `Parse` 型は削除されました。代わりに `MLParser` を使用してください。

```ts
// v4
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
const parser: MLMarkupLanguageParser = { ... };

// v5
import type { MLParser } from '@markuplint/ml-ast';
const parser: MLParser = { ... };
```

## `getNamespace` の `parser-utils` への移動

`getNamespace()` は `@markuplint/html-parser` から削除され、`@markuplint/parser-utils` に移動しました。シグネチャも変更されています。

```ts
// v4
import { getNamespace } from '@markuplint/html-parser';
const ns = getNamespace(tagName, parentNamespace);

// v5
import { getNamespace } from '@markuplint/parser-utils';
const ns = getNamespace(currentNodeName, parentNode);
```

|            | v4                         | v5                                    |
| ---------- | -------------------------- | ------------------------------------- |
| パッケージ | `@markuplint/html-parser`  | `@markuplint/parser-utils`            |
| 第1引数    | `tagName: string`          | `currentNodeName: string \| null`     |
| 第2引数    | `parentNamespace?: string` | `parentNode: MLASTParentNode \| null` |

:::note
`@markuplint/parser-utils` の基底 `Parser` クラスが名前空間検出を自動的に処理するようになりました。ほとんどのパーサーでは `getNamespace` を直接呼び出す必要はなくなっています。
:::

## DOM レイヤーへの影響

**DOM レイヤーの公開 API（`MLToken`、`MLElement` など）に変更はありません。** 以下のゲッターは引き続き利用可能です。

- `startLine`、`startCol`、`startOffset`
- `endLine`、`endCol`、`endOffset`
- `raw`、`fixed`

カスタムルールで DOM レイヤーのみを使用している場合、移行作業は不要です。
