# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/pug-parser` | Build this package     |
| `yarn dev --scope @markuplint/pug-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/pug-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/pug-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention:

| Test File                                        | Coverage                                                       |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `src/index.spec.ts`                              | PugParser integration tests (parsing Pug templates end-to-end) |
| `src/pug-parser/index.spec.ts`                   | AST optimization tests (pugParse, optimizeAST)                 |
| `src/utils/get-offset-from-line-and-col.spec.ts` | Offset calculation utility tests                               |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/pug-parser';

const doc = parser.parse('div.foo#bar text content');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

## Recipes

### 1. Adding a New Pug AST Node Type

1. Read `src/types.ts` — add the new optimized type:
   ```ts
   export type ASTNewType = PugAST.NewType & AdditionalASTData;
   ```
2. Add the new type to the `ASTNode` union
3. Read `src/pug-parser/index.ts` — add a new `case` in `optimizeAST()`:
   ```ts
   case 'NewType': {
     const block = optimizeAST(node.block, tokens, pug);
     const newNode: ASTNewType = {
       type: node.type,
       raw,
       offset,
       endOffset,
       line,
       endLine,
       column,
       endColumn,
       block,
       filename: node.filename ?? null,
     };
     nodes.push(newNode);
     continue;
   }
   ```
4. Read `src/parser.ts` — add a new `case` in `nodeize()`:
   - For HTML-like elements: use `visitElement()` with `getNamespace()` and attributes
   - For Pug-specific constructs: use `visitPsBlock()` with child nodes
5. Build: `yarn build --scope @markuplint/pug-parser`
6. Test: `yarn test --scope @markuplint/pug-parser`

### 2. Modifying Attribute Processing

1. Read `src/parser.ts` — the `visitAttr()` method has three paths:
   - **Shorthand** (`#` / `.`): Uses `AttrState.BeforeValue`, sets `potentialName`
   - **Regular**: Uses `noQuoteValueType: 'script'`
   - **Value parsing**: Uses `scriptParser()` for type detection (Numeric, Boolean, String, Template, dynamic)
2. Make the change:
   - For new shorthand syntax: add a condition before the existing `#`/`.` check
   - For attribute name transforms: add after the `attr.name.raw.endsWith('!')` check
   - For value type detection: modify the `scriptParser()` result switch
3. Use `this.updateAttr()` to set metadata: `potentialName`, `potentialValue`, `isDuplicatable`, `valueType`
4. Build and test: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 3. Updating AST Optimization

1. Read `src/pug-parser/index.ts` — the optimization pipeline:
   - `pugParse()` — entry point: lex → parse → optimize
   - `optimizeAST()` — recursive node enrichment
   - `getOffsetsFromLines()` — cumulative offset lookup table
   - `getLocationFromToken()` — token matching by line/column
   - `getAttrs()` — attribute enrichment from lexer tokens
   - `getEndAttributeLocation()` — tag end position including attributes
   - `mergeTextNode()` — consecutive text node merging
   - `getPipelessText()` — pipeless text block detection
   - `getRawTextAndLocationEnd()` — multi-line text handling
   - `optimizeASTOfConditionalNode()` — else-if/else chain processing
2. Make the change, paying attention to:
   - Offsets must be computed from `getOffsetsFromLines()` using `offsets[line - 2]`
   - End positions come from matching lexer tokens via `getLocationFromToken()`
   - `raw` must be sliced from the original source: `pug.slice(offset, endOffset)`
   - Token cloning via `structuredClone()` is required — the parser mutates the token array
3. Build and test: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 4. Modifying Inline HTML Handling

1. Read `src/parser.ts` — the `Text` case in `nodeize()`:
   - Text with `<` or `#[` is parsed through `HtmlInPugParser`
   - `#ps:tag-interpolation` nodes are recursively parsed by `PugParser`
2. To change tag interpolation syntax:
   - Modify the `ignoreTags` in `HtmlInPugParser` constructor
   - Update the `#ps:tag-interpolation` detection in the `Text` case
   - Update the offset calculations for `#[` prefix and `]` suffix stripping
3. To change inline HTML behavior:
   - Modify the `HtmlInPugParser` class (extends `HtmlParser`)
   - The `offsetOffset`, `offsetLine`, `offsetColumn` context must be passed correctly
4. Build and test: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

### 5. Modifying the useOffset Indent Filtering

1. Read `src/pug-parser/index.ts` — the `pugParse()` function
2. The `useOffset` flag filters `indent` and `outdent` tokens when parsing sub-templates at non-zero offsets
3. To modify:
   - Change the filter condition in the `if (useOffset)` block
   - Consider whether other token types need filtering for the sub-template context
4. Build and test: `yarn build --scope @markuplint/pug-parser && yarn test --scope @markuplint/pug-parser`

## Troubleshooting

### Pug AST node has wrong offsets

**Symptom:** A Pug node's `offset`, `endOffset`, `endLine`, or `endColumn` is incorrect in the markuplint AST.

**Cause:** The `optimizeAST()` function is computing wrong offsets, or the matching lexer token is incorrect.

**Solution:**

1. Check `getOffsetsFromLines()` — verify the cumulative offset table is correct for the input
2. Check `getLocationFromToken()` — ensure the correct token is matched by line/column, and that `tokenType` filtering is correct
3. For tags with attributes, check `getEndAttributeLocation()` — verify it stops at the right token
4. Add debug logging: `console.log(JSON.stringify(node, null, 2))` in the relevant `optimizeAST()` case

### Tag interpolation is not parsed

**Symptom:** `#[tag content]` appears as raw text instead of being expanded into markuplint nodes.

**Cause:** The text node is not reaching the `HtmlInPugParser` path, or the `#ps:tag-interpolation` detection is failing.

**Solution:**

1. Check the `Text` case in `nodeize()` — ensure `originNode.raw.includes('#[')` evaluates to `true`
2. Check the `HtmlInPugParser` — verify `ignoreTags` correctly masks `#[...]`
3. Check the `#ps:tag-interpolation` detection — ensure `node.nodeName === '#ps:tag-interpolation'`
4. Check the recursive `PugParser` call — verify offset context (`offsetOffset`, `offsetLine`, `offsetColumn`) is computed correctly

### Attribute parsing fails for complex expressions

**Symptom:** A Pug attribute with a complex JavaScript value (e.g., `data-value=obj.prop + 1`) causes a parse error or incorrect AST.

**Cause:** The `scriptParser()` result is not being handled correctly for multi-token expressions.

**Solution:**

1. Check the `visitAttr()` method — the final `return` block handles multi-token expressions as `isDynamicValue: true, valueType: 'code'`
2. Check `scriptParser()` from `@markuplint/parser-utils` — verify it correctly tokenizes the value expression
3. For single-token expressions, verify the `switch (token.type)` handles the token type correctly

### Shorthand attribute has wrong potentialName

**Symptom:** `#my-id` or `.my-class` produces an attribute with the wrong `potentialName`.

**Cause:** The shorthand detection or `endOffset` recalculation is wrong.

**Solution:**

1. Check the `#`/`.` branch in `visitAttr()` — ensure `potentialName` is set to `'id'` for `#` and `'class'` for `.`
2. Check the `endOffset` recalculation in `nodeize()` Tag case — for shorthand attributes, `attr.offset === attr.endOffset` must be true, and `endOffset` should be `attr.offset + attr.val.length - 1`
3. Verify the `val` value from the Pug AST — for `#my-id`, `val` should be `"'my-id'"` (with surrounding quotes)

### Pipeless text not detected

**Symptom:** Indented text after a tag with `.` is not treated as pipeless text.

**Cause:** The `getPipelessText()` function is not finding `start-pipeless-text` / `end-pipeless-text` tokens, or the line range check is failing.

**Solution:**

1. Check the lexer output — verify that `start-pipeless-text` and `end-pipeless-text` tokens exist
2. Check the line range: `startPipelessText.loc.start.line < node.line && node.line < endPipelessText.loc.start.line`
3. If the tokens exist but the range is wrong, the issue may be in the pug-lexer version
