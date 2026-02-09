# Helpers & Utilities

## Helper Functions

### createNode()

**Source:** `src/ml-dom/helper/create-node.ts`

Factory function that dispatches AST node types to their corresponding MLDOM constructors.

| AST `type` Field                 | MLDOM Class                                                  | `nodeType` |
| -------------------------------- | ------------------------------------------------------------ | ---------- |
| `'doctype'`                      | `MLDocumentType`                                             | `10`       |
| `'starttag'`                     | `MLElement`                                                  | `1`        |
| `'comment'`                      | `MLComment`                                                  | `8`        |
| `'text'`                         | `MLText`                                                     | `3`        |
| `'psblock'`                      | `MLBlock`                                                    | `101`      |
| `'invalid'` (`kind: 'starttag'`) | `MLElement` (as `x-invalid`, `elementType: 'web-component'`) | `1`        |
| `'invalid'` (other kind)         | `MLText`                                                     | `3`        |

**Note:** `'endtag'` is not passed through `createNode()` -- it is skipped during document construction. `MLElement` creates `MLElementCloseTag` internally from its `pairNode` reference. `MLASTAttr` is handled by `MLElement` which creates `MLAttr` instances from the element's `attributes` array.

### Walkers

**Source:** `src/ml-dom/helper/walkers.ts`

#### `syncWalk(nodeList, walker)`

Synchronous depth-first tree walking. For each node in `nodeList`:

- If the node is an `ELEMENT_NODE` or `MARKUPLINT_PREPROCESSOR_BLOCK`: recursively walk its children first, **then** call the walker on the node (post-order traversal)

#### `sequentialWalker(list, walker)`

Sequential async walking. Ensures walkers execute one at a time regardless of whether the walker is sync or async. Uses an internal promise chain for sequential execution.

### accname

**Source:** `src/ml-dom/helper/accname.ts`

#### `getAccname(element, version)`

Computes the accessible name for an element following WAI-ARIA algorithms:

1. Attempt direct computation via `@markuplint/ml-spec`'s `get()` function (handles `aria-label`, `aria-labelledby`, etc.)
2. If the element has a pretender context with ARIA settings → use `getAccnameFromPretender()`:
   - Reads the `aria.name` property from the pretender config
   - If `name` is an object with `fromAttr` → reads the specified attribute's value from the original element
3. If the element has `aria-hidden="true"` or `hidden` attribute → return empty string
4. If the role supports `accessibleNameFromContent` → recursively concatenate child text content
5. Otherwise → return empty string

### getIndent

**Source:** `src/ml-dom/helper/get-indent.ts`

#### `getIndent(node)` (deprecated)

Analyzes indentation preceding a node by examining whitespace in adjacent text nodes.

Returns `MLDOMIndentation`:

| Property/Method | Type                                    | Description                                                                          |
| --------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `raw`           | `string`                                | The indentation string                                                               |
| `type`          | `'tab' \| 'space' \| 'mixed' \| 'none'` | Indentation type                                                                     |
| `width`         | `number`                                | Character count of indentation                                                       |
| `line`          | `number`                                | Line number where indentation occurs                                                 |
| `fix(raw)`      | Method                                  | Replaces the indentation by modifying the corresponding line in the source text node |

The `fix()` method splits the text node's `raw` by newlines, replaces the indentation on the target line, and calls `fix()` on the text node with the rejoined string.

## Supplementary Classes

### MLNamedNodeMap

**Source:** `src/ml-dom/node/named-node-map.ts`

Extends `Array<MLAttr>` and implements the DOM `NamedNodeMap` interface. Used by `MLElement.attributes`.

- **Deduplication**: Only the first occurrence of each attribute name is kept
- **`getNamedItem(qualifiedName)`**: Case-sensitive name lookup, returns `MLAttr | null`
- **`item(index)`**: Index-based access
- Mutation methods (`setNamedItem`, `removeNamedItem`, etc.) throw `UnexpectedCallError`

#### `toNamedNodeMap(nodes)`

Helper function that creates an `MLNamedNodeMap` from a readonly array of `MLAttr` instances.

### MLDomTokenList

**Source:** `src/ml-dom/node/dom-token-list.ts`

Extends `Array<string>` and implements the DOM `DOMTokenList` interface. Used for space-separated attribute values (e.g., `class`).

| Property/Method     | Type             | Description                                            |
| ------------------- | ---------------- | ------------------------------------------------------ |
| `value`             | `string`         | The original attribute value string                    |
| `contains(token)`   | `boolean`        | Set-based fast token existence check                   |
| `allTokens()`       | `Scope[]`        | Returns position information (`Scope`) for each token  |
| `pick(token)`       | `Scope \| null`  | Returns position info for a specific token             |
| `add(...tokens)`    | `void`           | Adds tokens (modifies the underlying attribute values) |
| `item(index)`       | `string \| null` | Index-based token access                               |
| `forEach(callback)` | `void`           | Iterates tokens with callback                          |
| `toString()`        | `string`         | Returns the original `value` string                    |

Mutation methods (`remove`, `replace`, `toggle`, `supports`) throw `UnexpectedCallError`.

The `Scope` object contains `startOffset`, `endOffset`, `startLine`, `startCol`, `endLine`, `endCol` for precise source location of each token within the attribute value.

## Type Utilities

**Source:** `src/ml-dom/node/types.ts`

### MappedNode

Maps an AST node type to its corresponding MLDOM wrapper type at the TypeScript type level:

```typescript
type MappedNode<N, T, O> = N extends MLASTElement
  ? MLElement<T, O>
  : N extends MLASTComment
    ? MLComment<T, O>
    : N extends MLASTText
      ? MLText<T, O>
      : N extends MLASTDoctype
        ? MLDocumentType<T, O>
        : N extends MLASTPreprocessorSpecificBlock
          ? MLBlock<T, O>
          : N extends MLASTAttr
            ? MLAttr<T, O>
            : N extends MLASTInvalid
              ? MLText<T, O>
              : N extends MLASTToken
                ? MLToken
                : never;
```

### NodeTypeOf

Resolves a numeric node type constant to its MLDOM class type, enabling the `is()` type guard:

```typescript
type NodeTypeOf<NT, T, O> = NT extends 1
  ? MLElement<T, O> // ELEMENT_NODE
  : NT extends 8
    ? MLComment<T, O> // COMMENT_NODE
    : NT extends 3
      ? MLText<T, O> // TEXT_NODE
      : NT extends 9
        ? MLDocument<T, O> // DOCUMENT_NODE
        : NT extends 10
          ? MLDocumentType<T, O> // DOCUMENT_TYPE_NODE
          : NT extends 11
            ? MLDocumentFragment<T, O> // DOCUMENT_FRAGMENT_NODE
            : NT extends 101
              ? MLBlock<T, O> // MARKUPLINT_PREPROCESSOR_BLOCK
              : NT extends 2
                ? MLAttr<T, O> // ATTRIBUTE_NODE
                : never;
```

### AccessibilityProperties

Computed accessibility properties returned by `MLDocument.getAccessibilityProp()`:

```typescript
type AccessibilityProperties =
  | {
      unknown: false;
      exposedToTree: boolean;
      role?: string;
      name?: string | { unknown: true };
      nameRequired?: boolean;
      nameProhibited?: boolean;
      focusable?: boolean;
      props?: Record<string, { value: string | null; required: boolean }>;
    }
  | {
      unknown: true;
    };
```

### PretenderContext

Context for the pretender system:

```typescript
// Element pretending to be another element
type PretenderContextPretender<N, T, O> = {
  readonly type: 'pretender';
  readonly as: N; // The virtual MLElement being pretended as
  readonly aria?: PretenderARIA;
};

// Virtual element pointing back to the original
type PretenderContextPretended<N, T, O> = {
  readonly type: 'origin';
  readonly origin: N; // The original MLElement
};

type PretenderContext<N, T, O> = PretenderContextPretender<N, T, O> | PretenderContextPretended<N, T, O>;
```
