---
description: Maintenance tasks for @markuplint/pug-parser
globs:
  - packages/@markuplint/pug-parser/src/**/*.ts
alwaysApply: false
---

# pug-parser-maintenance

Perform maintenance tasks for `@markuplint/pug-parser`: add node type handling in nodeize(),
modify attribute processing in visitAttr(), and update AST optimization in pug-parser/index.ts.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                          | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `add-node-type-handling`      | Add handling for a new Pug AST node type in nodeize() |
| `modify-attribute-processing` | Modify Pug attribute processing in visitAttr()        |
| `update-ast-optimization`     | Update AST optimization in pug-parser/index.ts        |

If omitted, defaults to `add-node-type-handling`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, parse pipeline, attribute processing, and AST optimization
- `src/parser.ts` -- PugParser class (source of truth for nodeize/visitAttr)
- `src/pug-parser/index.ts` -- AST optimization (source of truth for optimizeAST)

## Task: add-node-type-handling

Add handling for a new Pug AST node type. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Define the type

1. Read `src/types.ts` and add the new optimized AST type extending the `PugAST` namespace type with `AdditionalASTData`
2. Add the new type to the `ASTNode` union

### Step 2: Add optimization

1. Read `src/pug-parser/index.ts`
2. Add a new `case` in `optimizeAST()` for the new node type
3. Compute `offset`, `endOffset`, `endLine`, `endColumn`, and `raw` using the standard pattern
4. If the node has a `block`, recursively call `optimizeAST()` on it
5. If the node has attributes, call `getAttrs()` to enrich them

### Step 3: Add nodeize handling

1. Read `src/parser.ts`
2. Add a new `case` in `nodeize()` — decide whether to use `visitElement()`, `visitPsBlock()`, `visitComment()`, `visitText()`, or `visitDoctype()`
3. Most Pug-specific constructs should use `visitPsBlock()` with child nodes from `block.nodes` or `nodes`

### Step 4: Verify

1. Build: `yarn build --scope @markuplint/pug-parser`
2. Test: `yarn test --scope @markuplint/pug-parser`
3. Add test cases using `nodeListToDebugMaps` assertions

## Task: modify-attribute-processing

Modify Pug attribute processing in visitAttr(). Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand the current processing

1. Read `src/parser.ts` — the `visitAttr()` method
2. Understand the three paths: shorthand (`#`/`.`), regular attributes, and value type parsing via `scriptParser()`
3. Read the base `Parser.visitAttr()` in `@markuplint/parser-utils` for the parent behavior

### Step 2: Make the change

1. For shorthand attributes: modify the `token.raw[0] === '#' || token.raw[0] === '.'` branch
2. For regular attributes: modify the options passed to `super.visitAttr()` (quoteSet, noQuoteValueType, etc.)
3. For value types: modify the `scriptParser()` result handling
4. Use `this.updateAttr()` to set `potentialName`, `potentialValue`, `isDuplicatable`, `valueType`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/pug-parser`
2. Test: `yarn test --scope @markuplint/pug-parser`

## Task: update-ast-optimization

Update AST optimization in pug-parser/index.ts. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the optimization pipeline

1. Read `src/pug-parser/index.ts`
2. Understand the flow: `pugParse()` → `lexer()` → `parser()` → `optimizeAST()`
3. Understand the helper functions: `getOffsetsFromLines()`, `getLocationFromToken()`, `getAttrs()`, `getEndAttributeLocation()`, `mergeTextNode()`, `getPipelessText()`, `getRawTextAndLocationEnd()`

### Step 2: Make the change

1. For offset computation changes: modify `getOffsetsFromLines()` or the offset calculation in `optimizeAST()`
2. For attribute enrichment: modify `getAttrs()` or `getEndAttributeLocation()`
3. For text handling: modify `mergeTextNode()`, `getPipelessText()`, or `getRawTextAndLocationEnd()`
4. For conditional chains: modify `optimizeASTOfConditionalNode()`
5. Ensure the token matching logic in `getLocationFromToken()` is correct

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/pug-parser`
2. Test: `yarn test --scope @markuplint/pug-parser`
3. Verify with `pug-parser/index.spec.ts` tests

## Rules

1. **Use pug-lexer and pug-parser for tokenization** — never parse Pug syntax manually. The `pugParse()` function is the only entry point.
2. **Optimize AST before converting to markuplint nodes** — all nodes must have `offset`, `endOffset`, `endLine`, `endColumn`, and `raw` computed in `optimizeAST()` before `nodeize()` processes them.
3. **Test with `nodeListToDebugMaps`** — this is the standard assertion pattern for parser tests.
4. **Use `HtmlInPugParser` for inline HTML** — never parse inline HTML manually. The `HtmlInPugParser` handles `#[...]` masking.
5. **Recursively parse tag interpolation** — `#ps:tag-interpolation` nodes must be stripped of `#[` / `]` and re-parsed by a new `PugParser` instance.
6. **Add JSDoc comments** to all new public methods and properties.
