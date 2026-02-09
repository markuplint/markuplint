# Maintenance Guide

## Commands

| Command                                       | Description            |
| --------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/astro-parser` | Build this package     |
| `yarn dev --scope @markuplint/astro-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/astro-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/astro-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File              | Coverage                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `parser.spec.ts`       | AstroParser integration tests (frontmatter, expressions, attributes, namespaces, fragments) |
| `astro-parser.spec.ts` | astro-eslint-parser wrapper tests (raw AST output, attribute kinds, diagnostics)            |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/astro-parser';

const doc = parser.parse('<div class:list={["a"]}>{name}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

The second argument `true` to `nodeListToDebugMaps` includes attribute details in the output, which is essential for testing directive and dynamic value handling.

## Recipes

### 1. Adding a New Template Directive

1. Read `src/parser.ts` — the `visitAttr()` method, specifically the `switch (lowerCaseDirectiveName)` block
2. Add a new `case` for the directive prefix:
   - If the directive maps to a standard HTML attribute (like `class:list` → `class`), set `potentialName` to the HTML attribute name
   - If the directive is Astro-specific (like `set:html`), set `isDirective = true`
3. Example — adding a hypothetical `style:inline` directive that maps to `style`:
   ```ts
   case 'style': {
     potentialName = lowerCaseDirectiveName;
     break;
   }
   ```
4. Build: `yarn build --scope @markuplint/astro-parser`
5. Add test cases to `src/parser.spec.ts`:
   ```ts
   test('style:inline directive', () => {
     const ast = parse('<div style:inline={styles}></div>');
     const map = nodeListToDebugMaps(ast.nodeList, true);
     // Verify potentialName: style and isDynamicValue: true
   });
   ```
6. Test: `yarn test --scope @markuplint/astro-parser`

### 2. Modifying Namespace Scoping

1. Read `src/parser.ts` — the `#updateScopeNS()` private method
2. The method has two conditions:
   - XHTML → SVG: when current namespace is XHTML and node is a `<svg>` element
   - SVG → XHTML: when current namespace is SVG and parent is `<foreignObject>`
3. To add a new namespace transition (e.g., MathML):
   ```ts
   if (
     parentNS === 'http://www.w3.org/1999/xhtml' &&
     originNode.type === 'element' &&
     originNode.name?.toLowerCase() === 'math'
   ) {
     this.state.scopeNS = 'http://www.w3.org/1998/Math/MathML';
   }
   ```
4. Build and test: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser`
5. Add namespace test cases to `src/parser.spec.ts`:
   ```ts
   test('MathML namespace', () => {
     const doc = parse('<div><math><mi>x</mi></math></div>');
     expect(doc.nodeList[1].namespace).toBe('http://www.w3.org/1998/Math/MathML');
   });
   ```

### 3. Updating Expression Handling

1. Read `src/parser.ts` — the `case 'expression'` block in `nodeize()`
2. The expression splitting logic works as follows:
   - If the expression has multiple children (`firstChild !== lastChild`):
     - Opening fragment: from expression start to first child's end
     - Closing fragment: from last child's start to expression end
     - Children are visited within the opening fragment's psblock
   - If the expression has a single child or no children:
     - The entire expression is emitted as one MustacheTag psblock
3. When modifying:
   - Ensure `sliceFragment()` offsets are correct for both opening and closing fragments
   - The closing fragment must have `isFragment: false`
   - The opening fragment must have `isFragment: true` and pass `originNode.children` for child visitation
4. Build and test: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser`
5. Test with complex expressions:
   ```ts
   test('Nested expression with HTML', () => {
     const ast = parse('<ul>{list.map(item => <li>{item}</li>)}</ul>');
     const map = nodeListToDebugMaps(ast.nodeList);
     // Verify opening MustacheTag, nested elements, and closing MustacheTag
   });
   ```

## Upstream Impact Checklist

Changes to upstream packages can affect this parser:

| Package                    | Impact                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `@markuplint/parser-utils` | Base `Parser` class changes affect all override methods          |
| `@markuplint/ml-ast`       | AST type changes affect `nodeize()` return types                 |
| `astro-eslint-parser`      | Parser output format changes affect `tokenize()` and `nodeize()` |

When updating `astro-eslint-parser`:

```shell
# Update the runtime dependency
yarn upgrade astro-eslint-parser --scope @markuplint/astro-parser

# Update the dev dependency for types
yarn upgrade @astrojs/compiler --scope @markuplint/astro-parser --dev

# Verify compatibility
yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser
```

## Troubleshooting

### Frontmatter is not recognized

**Symptom:** The `---...---` block is not parsed as a Frontmatter psblock, or its content leaks into the HTML AST.

**Cause:** `astro-eslint-parser` may not be producing a `type: 'frontmatter'` node, or the node's position offsets are incorrect.

**Solution:**

1. Add a test in `src/astro-parser.spec.ts` to verify the raw AST output from `astroParse()`
2. Check that the frontmatter node has correct `position.start.offset` and `position.end.offset`
3. Verify the `case 'frontmatter'` branch in `nodeize()` is being reached

### Expression splitting produces wrong offsets

**Symptom:** MustacheTag psblock nodes have incorrect start/end positions, or nested HTML elements inside expressions are misaligned.

**Cause:** The `sliceFragment()` calls in the `case 'expression'` branch are using wrong offsets from the Astro AST children.

**Solution:**

1. Check `firstChild.position?.end?.offset` and `lastChild.position?.start.offset` — these must match the Astro AST positions exactly
2. Verify that `startExpressionEndOffset` falls between the expression start and the first HTML child
3. Use `nodeListToDebugMaps` to compare actual vs expected positions

### Namespace is not applied correctly

**Symptom:** Elements inside `<svg>` have XHTML namespace, or elements inside `<foreignObject>` have SVG namespace.

**Cause:** `#updateScopeNS()` is not detecting the element type correctly, or the `scopeNS` state is not being reset.

**Solution:**

1. Check that `originNode.type === 'element'` — only element nodes trigger namespace changes
2. Check `originNode.name?.toLowerCase()` — the comparison must be case-insensitive for `svg`
3. Check the `parentNode.nodeName === 'foreignObject'` comparison — this uses the markuplint node name, not the Astro AST name
4. Add a test case with the specific nesting pattern to `src/parser.spec.ts`

### Template directive not detected

**Symptom:** An attribute like `set:html={content}` does not get `isDirective: true`, or `class:list` does not get `potentialName: 'class'`.

**Cause:** The regex `/^([^:]+):([^:]+)$/` did not match, or the switch case is missing.

**Solution:**

1. Verify the attribute name format — the regex requires exactly one colon with non-empty parts on both sides
2. Check the `switch (lowerCaseDirectiveName)` — the directive prefix must match a case
3. If it is a new directive prefix, add a new case (see Recipe #1)
