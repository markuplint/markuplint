# MLNode / MLParentNode

## MLNode

**Source:** `src/ml-dom/node/node.ts`

Abstract base class for all markuplint DOM node wrappers. Extends `MLToken` with DOM `Node` interface compliance, tree traversal, rule configuration access, and child node management.

### Node Type Constants

| Constant                        | Value | DOM Standard              |
| ------------------------------- | ----- | ------------------------- |
| `ELEMENT_NODE`                  | `1`   | Yes                       |
| `ATTRIBUTE_NODE`                | `2`   | Yes                       |
| `TEXT_NODE`                     | `3`   | Yes                       |
| `CDATA_SECTION_NODE`            | `4`   | Yes                       |
| `PROCESSING_INSTRUCTION_NODE`   | `7`   | Yes                       |
| `COMMENT_NODE`                  | `8`   | Yes                       |
| `DOCUMENT_NODE`                 | `9`   | Yes                       |
| `DOCUMENT_TYPE_NODE`            | `10`  | Yes                       |
| `DOCUMENT_FRAGMENT_NODE`        | `11`  | Yes                       |
| `MARKUPLINT_PREPROCESSOR_BLOCK` | `101` | No (markuplint extension) |

### Tree Structure Properties

| Property                | Type                                                               | Description                                                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `parentNode`            | `MLDocument \| MLDocumentFragment \| MLElement \| null`            | DOM-compliant parent. Transparent `MLBlock` parents are skipped.                |
| `parentElement`         | `MLElement \| null`                                                | Nearest ancestor that is an `MLElement`                                         |
| `syntacticalParentNode` | `MLDocument \| MLDocumentFragment \| MLElement \| MLBlock \| null` | Syntactical parent including `MLBlock` nodes                                    |
| `childNodes`            | `NodeListOf<MLChildNode>`                                          | Child nodes (Element, Text, Comment, Block). Fragment children are inlined.     |
| `firstChild`            | `MLChildNode \| null`                                              | First child node                                                                |
| `lastChild`             | `MLChildNode \| null`                                              | Last child node                                                                 |
| `nextSibling`           | `MLChildNode \| null`                                              | Next sibling with the same `parentNode`                                         |
| `previousSibling`       | `MLChildNode \| null`                                              | Previous sibling with the same `parentNode`                                     |
| `nextNode`              | `MLNode \| null`                                                   | Next node in syntactical sibling list (from `syntacticalParentNode.childNodes`) |
| `prevNode`              | `MLNode \| null`                                                   | Previous node in syntactical sibling list                                       |
| `prevToken`             | `MLNode \| null`                                                   | Previous node in document-order `nodeList` (skips omitted elements)             |
| `ownerDocument`         | `any`                                                              | Owner document (DOM-compatible, typed as `any`)                                 |
| `ownerMLDocument`       | `MLDocument<T, O>`                                                 | Owner document with proper generic types                                        |
| `isFragment`            | `boolean`                                                          | Whether this node acts as a fragment                                            |

#### `nextNode`/`prevNode` vs `nextSibling`/`previousSibling`

These two pairs serve different purposes:

- **`nextNode`/`prevNode`**: Navigate the syntactical sibling list from `syntacticalParentNode.childNodes` (or `nodeList` if no syntactical parent). These include `MLBlock` nodes and work at the AST level.
- **`nextSibling`/`previousSibling`**: Navigate siblings sharing the same DOM `parentNode`. These skip over nodes whose `parentNode` differs (e.g., nodes inside non-transparent blocks).

#### `prevToken` and Omitted Elements

`prevToken` walks the document-order `nodeList` but **skips omitted (ghost) elements**. Omitted elements have no corresponding source tokens, so including them would break offset calculations. This is important for indentation analysis and source reconstruction.

### `childNodes` and Fragment Expansion

When a child node has `isFragment === true`, its own children are inlined into the parent's `childNodes`:

```jsx
// JSX fragment
<div>
  <>
    {' '}
    {/* isFragment = true */}
    <p>A</p>
    <p>B</p>
  </>
  <p>C</p>
</div>
```

`div.childNodes` yields `[<p>A</p>, <p>B</p>, <p>C</p>]` -- the fragment wrapper is transparent.

### `parentNode` and MLBlock Transparency

The `parentNode` getter handles `MLBlock` transparency:

1. Get the `syntacticalParentNode`
2. If the parent is an `MLBlock` with `isTransparent === true`: return the block's `parentNode` (recursive skip)
3. If the parent is an `MLBlock` with `isTransparent === false`: return `null` (the node is "orphaned" from the DOM perspective)
4. If the parent is a fragment `MLDocument` (i.e., `isFragment === true`): return `null`
5. Otherwise: return the parent as-is

| Scenario                                      | `syntacticalParentNode` | `parentNode`               |
| --------------------------------------------- | ----------------------- | -------------------------- |
| `<div>` inside `<body>`                       | `<body>`                | `<body>`                   |
| `<span>` inside Pug `if` block inside `<div>` | `#ml-block`             | `<div>` (transparent skip) |
| `<span>` inside non-transparent block         | `#ml-block`             | `null`                     |
| Top-level in fragment document                | `#document`             | `null`                     |

```pug
//- Pug example
div
  if foo
    span
    //- syntacticalParentNode: #ml-block
    //- parentNode: <div>  (block is transparent, skipped)
```

### `conditionalChildNodes()` -- Conditional Branch Pattern Generation

Generates all possible child node combinations from template engine conditional branches. This is used by rules like `permitted-contents` to verify content models against every possible rendering path.

#### Algorithm

1. Walk `childNodes` sequentially
2. When an `MLBlock` is encountered, determine the branch `mode` from its `conditionalType`:
   - `'if'` or `'if:elseif'` → mode `'if'`
   - `'each'` → mode `'each'`
   - `'switch:case'` → mode `'switch'`
   - `'if:else'`, `'each:empty'`, `'switch:default'`, `'await'`, `'await:catch'`, `'await:then'` → continue in current mode
   - Other types → skip (not a conditional branch)
3. Recursively call `conditionalChildNodes()` on the block to get its sub-patterns
4. Collect branches; when a non-block child is reached, close the current branch group
5. Whitespace-only text nodes are skipped
6. For `'if'`, `'each'`, `'switch'` modes: a `null` sentinel is appended to represent the "empty branch" (the case where nothing is rendered)
7. Pass the collected branches to `branchesToPatterns()` to generate the Cartesian product of all combinations

#### Example

```html
<ul>
  {% if cond %}
  <li>A</li>
  {% else %}
  <li>B</li>
  {% endif %}
  <li>C</li>
</ul>
```

`ul.conditionalChildNodes()` returns:

- Pattern 1: `[<li>A</li>, <li>C</li>]`
- Pattern 2: `[<li>B</li>, <li>C</li>]`

The `permitted-contents` rule checks **every** pattern to ensure validity.

### `findSubsequentNodes(selector?)`

Collects nodes appearing after this node in document order:

1. Iterates `ownerMLDocument.nodeList`
2. Skips nodes whose `endOffset <= this.endOffset`
3. Skips descendants (via `this.contains(node)`)
4. If `selector` is provided: only includes elements matching the CSS selector
5. If no `selector`: includes all subsequent `MLChildNode` instances (Element, Text, Comment, Block)

### Rule Properties

| Property | Type                      | Description                                  |
| -------- | ------------------------- | -------------------------------------------- |
| `rules`  | `Record<string, AnyRule>` | Rules mapped to this node by `RuleMapper`    |
| `rule`   | `RuleInfo<T, O>`          | Current rule's resolved config for this node |

The `rule` getter retrieves the setting for the currently-evaluating rule (via `document.currentRule.name`) from the `rules` record, then resolves it through `optimizeOption()`. It throws an error if no rule is currently being evaluated.

### Type Narrowing with `is()`

The `is()` method returns `this is NodeTypeOf<NType, T, O>`, enabling TypeScript type narrowing:

```typescript
function processNode(node: MLNode<any, any>) {
  if (node.is(node.ELEMENT_NODE)) {
    // node is narrowed to MLElement<any, any>
    console.log(node.localName);
  } else if (node.is(node.TEXT_NODE)) {
    // node is narrowed to MLText<any, any>
    console.log(node.isWhitespace());
  } else if (node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)) {
    // node is narrowed to MLBlock<any, any>
    console.log(node.conditionalType);
  }
}
```

## MLParentNode

**Source:** `src/ml-dom/node/parent-node.ts`

Abstract base class for nodes that can have children (`MLElement`, `MLDocument`, `MLDocumentFragment`). Implements the DOM `ParentNode` mixin.

### Properties

| Property            | Type                          | Description                    |
| ------------------- | ----------------------------- | ------------------------------ |
| `children`          | `HTMLCollectionOf<MLElement>` | Element-only children (cached) |
| `childElementCount` | `number`                      | Number of element children     |
| `firstElementChild` | `MLElement \| null`           | First child element            |
| `lastElementChild`  | `MLElement \| null`           | Last child element             |

### Methods

| Method             | Signature                                                    | Description                                                        |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `querySelector`    | `querySelector(selectors: string): MLElement \| null`        | First descendant matching CSS selector                             |
| `querySelectorAll` | `querySelectorAll(selectors: string): NodeListOf<MLElement>` | All descendants matching CSS selector (cached per selector string) |

### `_descendantsToArray(filter?)`

Protected method that walks the tree recursively via `syncWalk` and returns a filtered array of descendants. Used internally by `querySelectorAll`.
