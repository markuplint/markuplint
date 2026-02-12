# AST Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Parser plugin developers** who create custom parsers implementing the `MLParser` interface
- **Custom rule authors** who directly access AST-level token properties

> **Custom rule authors**: If you only use the DOM layer (`MLElement`, `MLToken`, etc.), your code is **not affected**. The public API of the DOM layer remains unchanged. See [DOM Layer Impact](#dom-layer-impact) for details.

## Summary of Changes

| Change | Impact |
|--------|--------|
| Token position properties renamed | Parser plugins |
| End position properties removed | Parser plugins |
| `selfClosingSolidus` removed | Parser plugins |
| `conditionalType` replaced by `blockBehavior` | Parser plugins |
| `MLMarkupLanguageParser` / `Parse` types removed | Parser plugins |

## Token Position Properties

`MLASTToken` position properties have been simplified.

### Renamed Properties

| v4 | v5 |
|----|-----|
| `startOffset` | `offset` |
| `startLine` | `line` |
| `startCol` | `col` |

### Removed Properties

`endOffset`, `endLine`, and `endCol` have been removed from `MLASTToken`. Derive them from the start position and `raw` string:

```ts
// v4
const end = token.endOffset;

// v5
const end = token.offset + token.raw.length;
```

For line/column, use helpers from `@markuplint/parser-utils`:

```ts
import { getEndLine, getEndCol, getEndPosition } from '@markuplint/parser-utils/location';

const endLine = getEndLine(token.raw, token.line);
const endCol = getEndCol(token.raw, token.col);

// Or get all end positions at once:
const { endOffset, endLine, endCol } = getEndPosition(token.raw, token.offset, token.line, token.col);
```

## `selfClosingSolidus` Removed

`MLASTElement.selfClosingSolidus` has been removed. Use `tagCloseChar` instead:

```ts
// v4
if (element.selfClosingSolidus) {
  // self-closing element
}

// v5
if (element.tagCloseChar.startsWith('/')) {
  // self-closing element (tagCloseChar is "/>" )
}
```

## `conditionalType` Replaced by `blockBehavior`

`MLASTPreprocessorSpecificBlock.conditionalType` has been replaced by `blockBehavior`, which is also available on `MLASTElement`.

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

`blockBehavior` is an object with `type` and `expression`:

```ts
interface MLASTBlockBehavior {
  readonly type: MLASTBlockBehaviorType;
  readonly expression: string;
}
```

## `MLMarkupLanguageParser` / `Parse` Type Removed

The legacy `MLMarkupLanguageParser` and `Parse` types have been removed. Use the `MLParser` interface:

```ts
// v4
import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';

const parser: MLMarkupLanguageParser = { ... };

// v5
import type { MLParser } from '@markuplint/ml-ast';

const parser: MLParser = { ... };
```

## DOM Layer Impact

**The DOM layer public API (`MLToken`, `MLElement`, etc.) is unchanged.** The following getters remain available:

- `startLine`, `startCol`, `startOffset`
- `endLine`, `endCol`, `endOffset`
- `raw`, `fixed`

If your custom rules only use the DOM layer, no changes are needed.
