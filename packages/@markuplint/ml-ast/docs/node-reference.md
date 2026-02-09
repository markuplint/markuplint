# Node Reference

Detailed reference for every AST node type defined in `@markuplint/ml-ast`.

## Overview

All AST nodes use a **discriminated union** pattern based on the `type` field. This enables exhaustive type narrowing via TypeScript's `switch` statement:

```typescript
import type { MLASTNode } from '@markuplint/ml-ast';

function handle(node: MLASTNode) {
  switch (node.type) {
    case 'doctype':
      /* node is MLASTDoctype */ break;
    case 'starttag':
      /* node is MLASTElement */ break;
    case 'endtag':
      /* node is MLASTElementCloseTag */ break;
    case 'comment':
      /* node is MLASTComment */ break;
    case 'text':
      /* node is MLASTText */ break;
    case 'psblock':
      /* node is MLASTPreprocessorSpecificBlock */ break;
    case 'invalid':
      /* node is MLASTInvalid */ break;
    case 'attr':
      /* node is MLASTHTMLAttr */ break;
    case 'spread':
      /* node is MLASTSpreadAttr */ break;
  }
}
```

## AST to MLDOM Mapping

Every AST node defined in this package is ultimately converted into an **MLDOM** node by `@markuplint/ml-core`. MLDOM is markuplint's DOM implementation that **conforms to the [DOM Standard](https://dom.spec.whatwg.org/)**. Each MLDOM class implements the corresponding DOM interface (`Node`, `Element`, `DocumentType`, `Comment`, `Text`, etc.) so that lint rules can use standard DOM APIs for inspection.

The mapping is performed by `createNode()` in `ml-core`:

| AST Type (`ml-ast`)                 | MLDOM Class (`ml-core`)   | DOM Interface Implemented | `nodeType` |
| ----------------------------------- | ------------------------- | ------------------------- | ---------- |
| `MLASTDoctype`                      | `MLDocumentType`          | `DocumentType`            | `10`       |
| `MLASTElement`                      | `MLElement`               | `Element`, `HTMLElement`  | `1`        |
| `MLASTComment`                      | `MLComment`               | `Comment`                 | `8`        |
| `MLASTText`                         | `MLText`                  | `Text`                    | `3`        |
| `MLASTPreprocessorSpecificBlock`    | `MLBlock`                 | _(markuplint-specific)_   | `101`      |
| `MLASTInvalid` (`kind: 'starttag'`) | `MLElement` (`x-invalid`) | `Element`, `HTMLElement`  | `1`        |
| `MLASTInvalid` (other)              | `MLText`                  | `Text`                    | `3`        |

### Special Nodes

- **`MLASTElementCloseTag`** is **not** passed through `createNode()`. Instead, `MLElement` internally creates an `MLElementCloseTag` from its `pairNode` reference. `MLElementCloseTag` is not part of the DOM tree traversal; it exists only as a satellite of its paired element.
- **`MLASTPreprocessorSpecificBlock`** maps to `MLBlock`, which is a **markuplint-specific extension** with no DOM Standard equivalent. It uses a custom `nodeType` of `101` (beyond the DOM Standard range). `MLBlock` is transparent -- its children are treated as belonging to the parent node for tree traversal purposes.
- **`MLASTHTMLAttr`** and **`MLASTSpreadAttr`** map to `MLAttr`, which implements the DOM `Attr` interface (`nodeType: 2`). Attributes are accessed via `MLElement.attributes` (`MLNamedNodeMap`), not through `createNode()`.

## Base Types

### MLASTToken

The foundational interface for all positional information. Every AST node and sub-token extends this.

| Field         | Type     | Description                                    |
| ------------- | -------- | ---------------------------------------------- |
| `uuid`        | `string` | Unique identifier for this token instance      |
| `raw`         | `string` | The original raw source text                   |
| `startOffset` | `number` | Zero-based character offset of the token start |
| `endOffset`   | `number` | Zero-based character offset of the token end   |
| `startLine`   | `number` | One-based line number where the token starts   |
| `endLine`     | `number` | One-based line number where the token ends     |
| `startCol`    | `number` | One-based column number where the token starts |
| `endCol`      | `number` | One-based column number where the token ends   |

**Coordinate system:** Offsets are zero-based (counting from 0), while lines and columns are one-based (counting from 1). This matches the conventions used by most text editors and error reporters.

### MLASTAbstractNode

An internal (non-exported) base interface that extends `MLASTToken` with structural metadata. All concrete node types extend this.

| Field        | Type                      | Description                                                 |
| ------------ | ------------------------- | ----------------------------------------------------------- |
| `type`       | `MLASTNodeType`           | Discriminant tag identifying the concrete node kind         |
| `nodeName`   | `string`                  | The node name (tag name, `#text`, `#comment`, etc.)         |
| `parentNode` | `MLASTParentNode \| null` | Reference to the parent node, or `null` for top-level nodes |

## MLASTDocument

**Role:** The root container returned by every parser. It is **not** a node in the AST tree itself, but rather the wrapper that holds the parse result.

| Field               | Type                           | Description                                                   |
| ------------------- | ------------------------------ | ------------------------------------------------------------- |
| `raw`               | `string`                       | The full original source code                                 |
| `nodeList`          | `readonly MLASTNodeTreeItem[]` | Flat list of top-level AST nodes in document order            |
| `isFragment`        | `boolean`                      | Whether the document is a fragment (no root element required) |
| `unknownParseError` | `string \| undefined`          | A description of any unknown parse error                      |

**Important:** `nodeList` is a **flat list** of top-level nodes, not a tree. Child nodes are accessible via each element's `childNodes` property. The list contains nodes in document order (the order they appear in the source).

## MLASTDoctype

**Type discriminant:** `'doctype'`

**Role:** Represents a DOCTYPE declaration (e.g., `<!DOCTYPE html>`). Always appears at the top level of the document.

| Field      | Type        | Description                                      |
| ---------- | ----------- | ------------------------------------------------ |
| `type`     | `'doctype'` | Discriminant tag                                 |
| `depth`    | `number`    | Nesting depth (always 0 for DOCTYPE)             |
| `name`     | `string`    | The declared document type name (e.g., `"html"`) |
| `publicId` | `string`    | The public identifier of the DOCTYPE, if any     |
| `systemId` | `string`    | The system identifier of the DOCTYPE, if any     |

**Example:**

```html
<!DOCTYPE html>
```

Produces a node with `name: "html"`, `publicId: ""`, `systemId: ""`.

## MLASTElement

**Type discriminant:** `'starttag'`

**Role:** Represents an opening element tag (e.g., `<div class="foo">`). This is the primary element representation in the AST and is the most feature-rich node type. It owns child nodes, attributes, and maintains a reference to its matching closing tag.

| Field                | Type                           | Description                                                                 |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `type`               | `'starttag'`                   | Discriminant tag                                                            |
| `depth`              | `number`                       | Nesting depth in the document tree                                          |
| `namespace`          | `string`                       | Namespace URI (e.g., `"http://www.w3.org/1999/xhtml"`)                      |
| `elementType`        | `ElementType`                  | Whether the element is `'html'`, `'web-component'`, or `'authored'`         |
| `isFragment`         | `boolean`                      | Whether the element acts as a fragment (e.g., React `<>`, Vue `<template>`) |
| `attributes`         | `readonly MLASTAttr[]`         | Attributes on this element                                                  |
| `hasSpreadAttr`      | `boolean \| undefined`         | Whether the element has one or more spread attributes                       |
| `childNodes`         | `readonly MLASTChildNode[]`    | Direct child nodes of this element                                          |
| `pairNode`           | `MLASTElementCloseTag \| null` | The matching closing tag, or `null` for void/self-closing elements          |
| `selfClosingSolidus` | `MLASTToken \| undefined`      | The self-closing solidus token (`/`), if present (e.g., `<br />`)           |
| `tagOpenChar`        | `string`                       | The characters that open this tag (usually `"<"`)                           |
| `tagCloseChar`       | `string`                       | The characters that close this tag (usually `">"`)                          |
| `isGhost`            | `boolean`                      | Whether this is a ghost node (omitted tag inferred by the parser)           |

### Element Type Classification

The `elementType` field classifies elements into three categories:

| Value             | Description                                                      | Examples                 |
| ----------------- | ---------------------------------------------------------------- | ------------------------ |
| `'html'`          | Native HTML element from the HTML Standard                       | `<div>`, `<span>`, `<p>` |
| `'web-component'` | Web Component according to the HTML Standard (contains a hyphen) | `<my-component>`         |
| `'authored'`      | Authored element through a view framework or template engine     | `<MyComponent>` (JSX)    |

### Tag Delimiters

The `tagOpenChar` and `tagCloseChar` fields represent the actual characters that delimit the tag. For standard HTML these are `"<"` and `">"`, but template engines may use different delimiters.

### Ghost Nodes (Omitted Tags)

When `isGhost` is `true`, the element was not explicitly written in the source but was inferred by the parser. In HTML, certain tags can be omitted (e.g., `<tbody>` inside `<table>`). Ghost nodes have an empty `raw` string.

### Pair Node Relationship

The `pairNode` field creates a **bidirectional link** between opening and closing tags:

- `MLASTElement.pairNode` points to its `MLASTElementCloseTag`
- `MLASTElementCloseTag.pairNode` points back to the `MLASTElement`

For void elements (`<br>`, `<img>`, etc.) and self-closing elements, `pairNode` is `null`.

### Fragment Elements

When `isFragment` is `true`, the element acts as a transparent wrapper with no actual DOM node. This is used for framework-specific constructs like React fragments (`<>...</>`) and Vue `<template>` wrappers.

**Example:**

```html
<div class="container" id="main">
  <p>Hello</p>
</div>
```

The `<div>` produces an `MLASTElement` with:

- `nodeName: "div"`
- `elementType: "html"`
- `namespace: "http://www.w3.org/1999/xhtml"`
- `attributes`: array containing `class` and `id` attributes
- `childNodes`: array containing the `<p>` element and text nodes
- `pairNode`: reference to the `</div>` closing tag

## MLASTElementCloseTag

**Type discriminant:** `'endtag'`

**Role:** Represents a closing element tag (e.g., `</div>`). Always paired with an `MLASTElement` via the `pairNode` field.

| Field          | Type           | Description                                        |
| -------------- | -------------- | -------------------------------------------------- |
| `type`         | `'endtag'`     | Discriminant tag                                   |
| `depth`        | `number`       | Nesting depth in the document tree                 |
| `parentNode`   | `null`         | Always `null` for closing tags                     |
| `pairNode`     | `MLASTElement` | The matching opening element tag                   |
| `tagOpenChar`  | `string`       | The characters that open this tag (usually `"</"`) |
| `tagCloseChar` | `string`       | The characters that close this tag (usually `">"`) |

**Why `parentNode` is always `null`:** In the AST model, only the opening tag (`MLASTElement`) participates in the parent-child tree structure. The closing tag exists as a separate node linked to the opening tag via `pairNode`, but it is not a child of any parent node. This avoids duplicating the element in the tree.

## MLASTComment

**Type discriminant:** `'comment'`

**Role:** Represents an HTML comment (e.g., `<!-- ... -->`).

| Field      | Type         | Description                              |
| ---------- | ------------ | ---------------------------------------- |
| `type`     | `'comment'`  | Discriminant tag                         |
| `nodeName` | `'#comment'` | Always `'#comment'`                      |
| `depth`    | `number`     | Nesting depth in the document tree       |
| `isBogus`  | `boolean`    | Whether the comment is bogus (malformed) |

### Bogus Comments

When `isBogus` is `true`, the comment is malformed according to the HTML specification. Examples of bogus comments include:

- `<!...>` (not a valid DOCTYPE or comment)
- `<?xml version="1.0"?>` (processing instructions in HTML)

The parser still captures these as comment nodes but flags them as bogus so that lint rules can report them.

## MLASTText

**Type discriminant:** `'text'`

**Role:** Represents character data between elements.

| Field      | Type      | Description                        |
| ---------- | --------- | ---------------------------------- |
| `type`     | `'text'`  | Discriminant tag                   |
| `nodeName` | `'#text'` | Always `'#text'`                   |
| `depth`    | `number`  | Nesting depth in the document tree |

The `raw` field (inherited from `MLASTToken`) contains the full text content, **including whitespace**. A text node between two elements may consist entirely of whitespace (newlines, indentation, etc.).

**Example:**

```html
<p>Hello, world!</p>
```

The text `Hello, world!` is represented as an `MLASTText` node with `raw: "Hello, world!"`.

## MLASTPreprocessorSpecificBlock

**Type discriminant:** `'psblock'`

**Role:** Represents control-flow and iteration constructs from template engines and frameworks. These are syntax constructs that do not exist in standard HTML but are used by preprocessors like Svelte, Vue, EJS, ERB, and others.

| Field             | Type                                            | Description                                           |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `type`            | `'psblock'`                                     | Discriminant tag                                      |
| `conditionalType` | `MLASTPreprocessorSpecificBlockConditionalType` | The kind of conditional or iteration construct        |
| `depth`           | `number`                                        | Nesting depth in the document tree                    |
| `nodeName`        | `string`                                        | The block's name as determined by the parser          |
| `isFragment`      | `boolean`                                       | Whether this block acts as a transparent fragment     |
| `childNodes`      | `readonly MLASTChildNode[]`                     | Direct child nodes within this block                  |
| `isBogus`         | `boolean`                                       | Whether this block is bogus (unparsable or malformed) |

### Conditional Type Values

The `conditionalType` field indicates the semantic role of the block:

| Value              | Description                        | Example (Svelte)        | Example (EJS/ERB)   |
| ------------------ | ---------------------------------- | ----------------------- | ------------------- |
| `'if'`             | Conditional branch (opening)       | `{#if condition}`       | `<% if (x) { %>`    |
| `'if:elseif'`      | Alternative conditional branch     | `{:else if condition}`  | `<% } else if { %>` |
| `'if:else'`        | Default (else) branch              | `{:else}`               | `<% } else { %>`    |
| `'switch:case'`    | Switch case branch                 | --                      | --                  |
| `'switch:default'` | Switch default branch              | --                      | --                  |
| `'each'`           | Iteration (loop) block             | `{#each items as item}` | `<% for (...) { %>` |
| `'each:empty'`     | Empty state for an iteration block | `{:else}` (in `#each`)  | --                  |
| `'await'`          | Asynchronous block (pending state) | `{#await promise}`      | --                  |
| `'await:then'`     | Resolved state of an async block   | `{:then value}`         | --                  |
| `'await:catch'`    | Rejected state of an async block   | `{:catch error}`        | --                  |
| `'end'`            | Closing block                      | `{/if}`, `{/each}`      | `<% } %>`           |
| `null`             | No specific conditional semantic   | --                      | `<%= expr %>`       |

### Framework-Specific Examples

**Svelte:**

```svelte
{#if loggedIn}
  <p>Welcome!</p>
{:else}
  <p>Please log in.</p>
{/if}
```

Produces three `psblock` nodes:

1. `conditionalType: 'if'` for `{#if loggedIn}`
2. `conditionalType: 'if:else'` for `{:else}`
3. `conditionalType: 'end'` for `{/if}`

**Vue (v-if directive is handled differently -- via element attributes, not psblock).**

**EJS:**

```ejs
<% if (user) { %>
  <p><%= user.name %></p>
<% } %>
```

Produces:

1. `conditionalType: 'if'` for `<% if (user) { %>`
2. `conditionalType: 'end'` for `<% } %>`
3. `conditionalType: null` for `<%= user.name %>` (expression output, no conditional semantic)

## MLASTInvalid

**Type discriminant:** `'invalid'`

**Role:** Represents markup that could not be parsed correctly. The parser captures unparsable content as invalid nodes rather than failing entirely, enabling lint rules to report the issue.

| Field      | Type                                                      | Description                              |
| ---------- | --------------------------------------------------------- | ---------------------------------------- |
| `type`     | `'invalid'`                                               | Discriminant tag                         |
| `nodeName` | `'#invalid'`                                              | Always `'#invalid'`                      |
| `depth`    | `number`                                                  | Nesting depth in the document tree       |
| `kind`     | `Exclude<MLASTChildNode['type'], 'invalid'> \| undefined` | The kind of node this was intended to be |
| `isBogus`  | `true`                                                    | Always `true` for invalid nodes          |

### The `kind` Field and ml-core Conversion

The `kind` field records what the parser believes the invalid content was intended to be. This information is used by `ml-core` when converting the AST into a DOM tree:

| `kind` Value            | ml-core Conversion                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `'starttag'`            | Converted to an `MLElement` with `nodeName: 'x-invalid'` and `elementType: 'web-component'` |
| Any other / `undefined` | Converted to an `MLText` node with `nodeName: '#text'`                                      |

This conversion allows lint rules to still operate on invalid content, treating it as either an element or text depending on the parser's best guess.

## MLASTHTMLAttr

**Type discriminant:** `'attr'`

**Role:** Represents a regular HTML attribute, fully decomposed into its constituent tokens. This granular decomposition enables lint rules to inspect and validate individual parts of an attribute (whitespace, quoting style, name, value).

| Field               | Type                                                       | Description                                                             |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `type`              | `'attr'`                                                   | Discriminant tag                                                        |
| `nodeName`          | `string`                                                   | The attribute name as a string                                          |
| `spacesBeforeName`  | `MLASTToken`                                               | Whitespace token before the attribute name                              |
| `name`              | `MLASTToken`                                               | The attribute name token                                                |
| `spacesBeforeEqual` | `MLASTToken`                                               | Whitespace token between the name and the equal sign                    |
| `equal`             | `MLASTToken`                                               | The equal sign token                                                    |
| `spacesAfterEqual`  | `MLASTToken`                                               | Whitespace token between the equal sign and the value                   |
| `startQuote`        | `MLASTToken`                                               | The opening quote token                                                 |
| `value`             | `MLASTToken`                                               | The attribute value token                                               |
| `endQuote`          | `MLASTToken`                                               | The closing quote token                                                 |
| `isDynamicValue`    | `true \| undefined`                                        | Whether the value is a dynamic expression (e.g., a framework binding)   |
| `isDirective`       | `true \| undefined`                                        | Whether the attribute is a framework directive (e.g., `v-if`, `@click`) |
| `potentialName`     | `string \| undefined`                                      | The resolved attribute name when the actual name is a directive         |
| `potentialValue`    | `string \| undefined`                                      | The resolved attribute value when the actual value is dynamic           |
| `valueType`         | `'string' \| 'number' \| 'boolean' \| 'code' \| undefined` | The semantic type of the attribute value                                |
| `candidate`         | `string \| undefined`                                      | A candidate attribute name for auto-correction                          |
| `isDuplicatable`    | `boolean`                                                  | Whether this attribute is allowed to appear multiple times              |

### Attribute Decomposition

An attribute is decomposed into individual tokens, each with its own positional information:

```
 ·class="container"
 ↑     ↑↑         ↑
 │     ││         └─ endQuote (raw: '"')
 │     │└─ value (raw: 'container')
 │     └─ startQuote (raw: '"')
 │        equal (raw: '=')
 │        spacesBeforeEqual (raw: '')
 │        spacesAfterEqual (raw: '')
 └─ spacesBeforeName (raw: ' ')
    name (raw: 'class')
```

For boolean attributes without a value (e.g., `disabled`), the `equal`, `startQuote`, `value`, and `endQuote` tokens exist but have empty `raw` strings.

### Framework Extension Fields

These fields are set by framework-specific parsers:

- **`isDynamicValue`**: `true` when the attribute value is a dynamic expression. For example, in Vue `<div :class="expr">`, the value `expr` is dynamic.
- **`isDirective`**: `true` when the attribute is a framework directive. For example, `v-if`, `v-for`, `@click` in Vue; `on:click` in Svelte.
- **`potentialName`**: The resolved standard attribute name. For example, `:class` resolves to `class`; `@click` resolves to `onclick`.
- **`potentialValue`**: The resolved attribute value when the dynamic expression can be statically analyzed.
- **`valueType`**: The semantic type of the value -- `'string'`, `'number'`, `'boolean'`, or `'code'` (an expression).
- **`candidate`**: A suggested correction for the attribute name, used by auto-fix rules.
- **`isDuplicatable`**: `true` when the attribute may appear multiple times on the same element (e.g., `class` in some template engines that merge values).

## MLASTSpreadAttr

**Type discriminant:** `'spread'`

**Role:** Represents a spread attribute (e.g., `{...props}` in JSX). This is a minimal node type since spread attributes cannot be statically decomposed.

| Field      | Type        | Description        |
| ---------- | ----------- | ------------------ |
| `type`     | `'spread'`  | Discriminant tag   |
| `nodeName` | `'#spread'` | Always `'#spread'` |

Note that `MLASTSpreadAttr` extends `MLASTToken` directly (not `MLASTAbstractNode`), so it has positional information (`uuid`, `raw`, `startOffset`, etc.) but no `parentNode` or `depth`.

## Union Types Reference

| Union Type          | Members                                                                                                                | Purpose                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `MLASTNode`         | `MLASTDoctype \| MLASTTag \| MLASTComment \| MLASTText \| MLASTPreprocessorSpecificBlock \| MLASTInvalid \| MLASTAttr` | Every possible AST node type                |
| `MLASTParentNode`   | `MLASTElement \| MLASTPreprocessorSpecificBlock`                                                                       | Nodes that can contain child nodes          |
| `MLASTChildNode`    | `MLASTTag \| MLASTText \| MLASTComment \| MLASTPreprocessorSpecificBlock \| MLASTInvalid`                              | Nodes that can appear as children           |
| `MLASTNodeTreeItem` | `MLASTChildNode \| MLASTDoctype`                                                                                       | Top-level items in `MLASTDocument.nodeList` |
| `MLASTTag`          | `MLASTElement \| MLASTElementCloseTag`                                                                                 | Tag nodes (opening or closing)              |
| `MLASTAttr`         | `MLASTHTMLAttr \| MLASTSpreadAttr`                                                                                     | Attribute nodes                             |

## Type Narrowing Patterns

### Narrowing by `type`

The most common pattern -- use a `switch` statement for exhaustive narrowing:

```typescript
import type { MLASTChildNode } from '@markuplint/ml-ast';

function processChild(node: MLASTChildNode) {
  switch (node.type) {
    case 'starttag':
      console.log(`Element: <${node.nodeName}>, attributes: ${node.attributes.length}`);
      break;
    case 'endtag':
      console.log(`Closing tag: </${node.nodeName}>`);
      break;
    case 'text':
      console.log(`Text: "${node.raw}"`);
      break;
    case 'comment':
      console.log(`Comment (bogus: ${node.isBogus})`);
      break;
    case 'psblock':
      console.log(`Block: ${node.nodeName}, conditional: ${node.conditionalType}`);
      break;
    case 'invalid':
      console.log(`Invalid: kind=${node.kind}`);
      break;
  }
}
```

### Checking for parent nodes

```typescript
import type { MLASTNode, MLASTParentNode } from '@markuplint/ml-ast';

function isParent(node: MLASTNode): node is MLASTParentNode {
  return node.type === 'starttag' || node.type === 'psblock';
}
```

### Distinguishing attribute types

```typescript
import type { MLASTAttr } from '@markuplint/ml-ast';

function processAttr(attr: MLASTAttr) {
  if (attr.type === 'attr') {
    // MLASTHTMLAttr -- has name, value, quotes, etc.
    console.log(`${attr.name.raw}="${attr.value.raw}"`);
  } else {
    // MLASTSpreadAttr -- only has raw and positional info
    console.log(`Spread: ${attr.raw}`);
  }
}
```
