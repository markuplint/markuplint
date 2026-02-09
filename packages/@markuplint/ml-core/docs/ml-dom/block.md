# MLBlock — Preprocessor Block Node

**Source:** `src/ml-dom/node/block.ts`

## Overview

`MLBlock` is a markuplint-specific DOM node that represents template engine constructs such as conditionals, loops, and other preprocessor directives. It has no DOM Standard equivalent; its `nodeType` is a custom value `101` (`MARKUPLINT_PREPROCESSOR_BLOCK`).

Template engines like Svelte, Nunjucks, EJS, Pug, and others produce constructs (e.g., `{#if}`, `{#each}`, `{% if %}`) that wrap HTML content in non-HTML blocks. The parser translates these into `MLASTPreprocessorSpecificBlock` AST nodes, which `MLBlock` wraps.

MLBlock serves as the bridge between template syntax and HTML content model validation. It enables markuplint to reason about conditional branches, iteration, and other control flow that affects which child nodes are actually present in the rendered HTML.

- `nodeName`: `'#ml-block'`
- `nodeType`: `101` (`MARKUPLINT_PREPROCESSOR_BLOCK`)

## Properties

| Property          | Type                                            | Description                                                                                              |
| ----------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `conditionalType` | `MLASTPreprocessorSpecificBlockConditionalType` | The type of conditional construct (see table below), or `null` for non-conditional blocks                |
| `isTransparent`   | `boolean`                                       | Whether the block is transparent in tree traversal; currently always `true` (see source TODO)            |
| `isFragment`      | `boolean`                                       | Whether this block acts as a transparent fragment (inherited from MLNode, set from `astNode.isFragment`) |

## conditionalType Values

`conditionalType` determines how the block participates in conditional child node pattern generation (see [Conditional Child Nodes](#conditional-child-nodes) below).

### Conditional Groups

Blocks with a recognized `conditionalType` form conditional groups. Each group starts with a "start" type and may include "branch" types:

| Group      | Start           | Branches                        | End                 |
| ---------- | --------------- | ------------------------------- | ------------------- |
| **if**     | `'if'`          | `'if:elseif'`, `'if:else'`      | `'end'` or implicit |
| **each**   | `'each'`        | `'each:empty'`                  | `'end'` or implicit |
| **switch** | `'switch:case'` | `'switch:default'`              | `'end'` or implicit |
| **await**  | `'await'`       | `'await:then'`, `'await:catch'` | `'end'` or implicit |

### All Values

| Value              | Description                                                      | Role                                                                              |
| ------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `'if'`             | Start of conditional block                                       | Starts a new conditional group                                                    |
| `'if:elseif'`      | Alternative conditional branch                                   | Starts a new conditional group (treated the same as `'if'` in pattern generation) |
| `'if:else'`        | Default (else) branch                                            | Branch within current group                                                       |
| `'switch:case'`    | Switch case branch                                               | Starts a new conditional group                                                    |
| `'switch:default'` | Switch default branch                                            | Branch within current group                                                       |
| `'each'`           | Start of iteration (loop) block                                  | Starts a new conditional group                                                    |
| `'each:empty'`     | Empty state for an iteration block                               | Branch within current group                                                       |
| `'await'`          | Asynchronous block (pending state)                               | Branch within current group                                                       |
| `'await:then'`     | Resolved state of async block                                    | Branch within current group                                                       |
| `'await:catch'`    | Rejected state of async block                                    | Branch within current group                                                       |
| `'end'`            | Closing block marker                                             | Ignored (filtered out by `default` in the switch)                                 |
| `null`             | No conditional semantic (e.g., expression output like `{value}`) | Not a conditional group; treated as a mutable child                               |

## Transparency

`MLBlock` is always transparent (`isTransparent = true`). Transparency is the core design principle that makes MLBlock invisible to DOM tree traversal while preserving parent-child semantics.

### Effect on `parentNode`

When a node's syntactical parent is a transparent MLBlock, `parentNode` skips the block and returns the block's own `parentNode` recursively. This means nodes inside template constructs report the enclosing HTML element (not the block) as their parent:

```
Source:                          parentNode returns:
<ul>                             ─┐
  {#if cond}     (MLBlock)        │  ← skipped
    <li>A</li>                    │  → <ul> (not the MLBlock)
  {/if}                           │
</ul>                            ─┘
```

The relevant code in `MLNode.parentNode`:

```typescript
if (parentNode.is(parentNode.MARKUPLINT_PREPROCESSOR_BLOCK)) {
  if (parentNode.isTransparent) {
    return parentNode.parentNode; // Recurse upward
  }
  return null; // Non-transparent block: orphan
}
```

If a block were non-transparent (`isTransparent = false`), its children would report `parentNode === null` (orphaned). Currently this does not happen since `isTransparent` is always `true`.

### Effect on `childNodes`

The block's children are inlined into the parent's `childNodes` through the `getPureChildNodes()` and `childNodes` expansion pipeline:

1. **`getPureChildNodes()`**: Works on `MARKUPLINT_PREPROCESSOR_BLOCK` the same way as on `ELEMENT_NODE` and `DOCUMENT_FRAGMENT_NODE` — it reads `astNode.childNodes`, filters out `endtag` and `invalid` nodes, and maps them to MLDOM nodes
2. **`childNodes`** (on the parent): Calls `getPureChildNodes()`, then for any child with `isFragment === true`, inlines its `childNodes` recursively

```
Source:                          <ul>.childNodes returns:
<ul>                             ─┐
  {#if cond}                      │  ← MLBlock is not in childNodes
    <li>A</li>                    │  → [<li>A</li>, <li>B</li>]
    <li>B</li>                    │
  {/if}                           │
</ul>                            ─┘
```

This ensures that rules validating parent-child relationships (like `permitted-contents`) see the effective HTML children, not the template engine wrappers.

### `syntacticalParentNode` vs `parentNode`

| Property                | Behavior                                         | Use case                               |
| ----------------------- | ------------------------------------------------ | -------------------------------------- |
| `syntacticalParentNode` | Returns the direct AST parent, including MLBlock | Understanding the raw parsed structure |
| `parentNode`            | Skips transparent MLBlock nodes                  | DOM-like tree traversal for lint rules |

## Conditional Child Nodes

The `conditionalChildNodes()` method on `MLNode` uses MLBlock's `conditionalType` to enumerate all possible child node patterns that could appear in the rendered output. This is critical for content model validation in the presence of template branching.

### Algorithm

1. Walk through `childNodes` of the current node
2. For each MLBlock child with a recognized `conditionalType`:
   - Determine the `mode` (`'if'`, `'each'`, or `'switch'`)
   - Recursively call `conditionalChildNodes()` on the block to get its sub-patterns
   - Collect all branch alternatives into a `subBranches` array
3. When a non-block child is encountered after a conditional group ends:
   - If the mode was `'if'`, `'each'`, or `'switch'`: push `null` as a sentinel (representing the "empty" case where none of the branches render)
   - Close the current group and push `subBranches` to `branches`
4. Skip whitespace-only text nodes
5. Non-block children are added directly to `branches`
6. Pass `branches` to `branchesToPatterns()` to compute the Cartesian product

### `branchesToPatterns()`

This utility function (from `@markuplint/shared`) computes the Cartesian product of branch alternatives:

- Regular items (non-array) appear in every pattern
- Array items represent alternatives — each item produces a separate pattern
- `null` values are filtered out (representing empty branches)

```
Input:  [A, [B, C], D]
Output: [[A, B, D], [A, C, D]]

Input:  [A, [B, null], C]
Output: [[A, B, C], [A, C]]    ← null filtered out = "no branch rendered"
```

### Example

Given the following Svelte template:

```svelte
<ul>
  {#if cond}
    <li>A</li>
  {:else}
    <li>B</li>
  {/if}
  <li>C</li>
</ul>
```

The AST structure is:

```
MLElement <ul>
  ├── MLBlock (conditionalType: 'if')
  │     └── MLElement <li>A</li>
  ├── MLBlock (conditionalType: 'if:else')
  │     └── MLElement <li>B</li>
  └── MLElement <li>C</li>
```

`conditionalChildNodes()` on `<ul>` produces:

```
branches = [[<li>A</li>, <li>B</li>, null], <li>C</li>]
                  ↓ branchesToPatterns()
Pattern 1: [<li>A</li>, <li>C</li>]   ← if branch taken
Pattern 2: [<li>B</li>, <li>C</li>]   ← else branch taken
Pattern 3: [<li>C</li>]               ← no branch (null filtered out)
```

The `null` sentinel is added because the conditional group (if/else) might not render anything at all (e.g., if the parser cannot determine whether a branch always executes). The `permitted-contents` rule validates all patterns to ensure the content model is satisfied in every case.

### Nested Conditionals

The algorithm handles nesting naturally through recursive `conditionalChildNodes()` calls:

```svelte
<div>
  {#if a}
    {#if b}
      <span>X</span>
    {:else}
      <span>Y</span>
    {/if}
  {:else}
    <span>Z</span>
  {/if}
</div>
```

The inner `{#if b}` block recursively generates its patterns `[<span>X</span>]`, `[<span>Y</span>]`, which are then flattened into the outer block's sub-branches.

## Interaction with `hasMutableChildren()`

`MLElement.hasMutableChildren()` uses `conditionalType` to distinguish between two categories of MLBlock:

- **Blocks WITH `conditionalType`** (e.g., `'if'`, `'each'`, `'switch:case'`): Skipped (`continue`) — these are handled by `conditionalChildNodes()` which enumerates all possible patterns
- **Blocks WITHOUT `conditionalType`** (`null`): Return `true` immediately — these represent expression outputs like `{value}` or other non-conditional template constructs whose content cannot be statically determined

```typescript
for (const child of this.getPureChildNodes()) {
  if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
    if (child.conditionalType) {
      continue; // Has conditional semantics → handled elsewhere
    }
    return true; // No conditional semantics → truly mutable
  }
  // ...
}
```

This distinction is crucial: an `{#if}` block produces deterministic branch patterns, while a `{variable}` block can produce arbitrary content. Rules like `permitted-contents` can validate the former but must skip the latter.

## Role in the Linting Pipeline

MLBlock participates at multiple levels of the linting pipeline:

### 1. Parsing Phase

Template engine parsers (Svelte, Nunjucks, EJS, Pug, etc.) produce `MLASTPreprocessorSpecificBlock` AST nodes. Each parser is responsible for:

- Setting `conditionalType` appropriately (e.g., Svelte `{#if}` → `'if'`, `{#each}` → `'each'`)
- Nesting child AST nodes within the block
- Setting `isFragment` when the block should act as a fragment container

### 2. MLDOM Construction

`createNode()` maps `'psblock'` AST type to `MLBlock`. The block is included in the document's `nodeList` alongside elements, text nodes, and comments.

### 3. Tree Traversal

Transparency ensures MLBlock is invisible to standard DOM traversal:

- `parentNode` skips transparent blocks
- `childNodes` inlines block children into the parent
- `walkOn('Element', ...)` does not encounter MLBlock nodes (only walks elements, text, comments, attrs, and close tags)

### 4. Content Model Validation

The `permitted-contents` rule uses `conditionalChildNodes()` to validate all possible content patterns:

```typescript
const childNodesPatterns = options.evaluateConditionalChildNodes
  ? el.conditionalChildNodes().map(childNodes => [...childNodes])
  : [[...el.childNodes].filter(/* ... */)];
```

Each pattern is independently validated against the HTML content model specification.

## Methods

MLBlock implements the `ChildNode` interface methods for DOM API compatibility:

| Method        | Signature                                        | Description                         |
| ------------- | ------------------------------------------------ | ----------------------------------- |
| `after`       | `after(...nodes: (string \| MLElement)[])`       | Insert nodes after this block       |
| `before`      | `before(...nodes: (string \| MLElement)[])`      | Insert nodes before this block      |
| `remove`      | `remove()`                                       | Remove this block from its parent   |
| `replaceWith` | `replaceWith(...nodes: (string \| MLElement)[])` | Replace this block with other nodes |

These methods delegate to shared implementations in `src/ml-dom/manipulations/child-node-methods.ts`.
