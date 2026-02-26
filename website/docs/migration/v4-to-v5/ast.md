---
sidebar_position: 8
title: AST
---

# AST Changes

This page covers breaking changes to the internal AST layer. It affects **parser plugin developers** and **custom rule authors** who access AST-level token properties directly.

:::tip Custom rule authors
If your rules only use the DOM layer (`MLElement`, `MLToken`, etc.), **no changes are needed**. The DOM layer public API is unchanged. See [DOM Layer Impact](#dom-layer-impact) below.
:::

## Summary

| Change                                           | Who is affected          |
| ------------------------------------------------ | ------------------------ |
| Token position properties renamed                | Parser plugin developers |
| End position properties removed                  | Parser plugin developers |
| `selfClosingSolidus` removed                     | Parser plugin developers |
| `conditionalType` replaced by `blockBehavior`    | Parser plugin developers |
| `MLMarkupLanguageParser` / `Parse` types removed | Parser plugin developers |
| `getNamespace` moved to `parser-utils`           | Parser plugin developers |

## Token position properties renamed

`MLASTToken` position properties have been simplified. The `start` prefix is dropped.

| v4            | v5       |
| ------------- | -------- |
| `startOffset` | `offset` |
| `startLine`   | `line`   |
| `startCol`    | `col`    |

## End position properties removed

:::caution Breaking Change
`endOffset`, `endLine`, and `endCol` have been removed from `MLASTToken`.
:::

Calculate them from the start position and `raw` string instead.

**End offset:**

```ts
// v4
const end = token.endOffset;

// v5
const end = token.offset + token.raw.length;
```

**End line/column** -- use helpers from `@markuplint/parser-utils`:

```ts
import { getEndLine, getEndCol, getEndPosition } from '@markuplint/parser-utils/location';

const endLine = getEndLine(token.raw, token.line);
const endCol = getEndCol(token.raw, token.col);

// Or get all end positions at once:
const { endOffset, endLine, endCol } = getEndPosition(token.raw, token.offset, token.line, token.col);
```

## `selfClosingSolidus` removed

Use `tagCloseChar` instead of `selfClosingSolidus`.

```ts
// v4
if (element.selfClosingSolidus) {
  // self-closing element
}

// v5
if (element.tagCloseChar.startsWith('/')) {
  // self-closing element (tagCloseChar is "/>")
}
```

## `conditionalType` replaced by `blockBehavior`

`conditionalType` has been replaced by `blockBehavior`. The new property is an object with `type` and `expression` fields. It is also available on `MLASTElement`.

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

The `blockBehavior` interface:

```ts
interface MLASTBlockBehavior {
  readonly type: MLASTBlockBehaviorType;
  readonly expression: string;
}
```

## `MLMarkupLanguageParser` type removed

The legacy `MLMarkupLanguageParser` and `Parse` types have been removed. Use `MLParser` instead.

```ts
// v4
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
const parser: MLMarkupLanguageParser = { ... };

// v5
import type { MLParser } from '@markuplint/ml-ast';
const parser: MLParser = { ... };
```

## `getNamespace` moved to `parser-utils`

`getNamespace()` has been removed from `@markuplint/html-parser`. It now lives in `@markuplint/parser-utils` with a new signature.

```ts
// v4
import { getNamespace } from '@markuplint/html-parser';
const ns = getNamespace(tagName, parentNamespace);

// v5
import { getNamespace } from '@markuplint/parser-utils';
const ns = getNamespace(currentNodeName, parentNode);
```

|                  | v4                         | v5                                    |
| ---------------- | -------------------------- | ------------------------------------- |
| Package          | `@markuplint/html-parser`  | `@markuplint/parser-utils`            |
| First parameter  | `tagName: string`          | `currentNodeName: string \| null`     |
| Second parameter | `parentNamespace?: string` | `parentNode: MLASTParentNode \| null` |

:::note
The base `Parser` class in `@markuplint/parser-utils` now handles namespace detection automatically. Most parsers no longer need to call `getNamespace` directly.
:::

## DOM Layer Impact

**The DOM layer public API (`MLToken`, `MLElement`, etc.) is unchanged.** These getters still work:

- `startLine`, `startCol`, `startOffset`
- `endLine`, `endCol`, `endOffset`
- `raw`, `fixed`

If your custom rules only use the DOM layer, no migration is needed.
