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

Namespace resolution is currently handled by the base `Parser` class from `@markuplint/parser-utils`. The Astro parser does not override namespace logic.

1. If you need to add custom namespace handling, you would override the relevant method in `AstroParser` in `src/parser.ts`
2. For new namespaces (e.g., MathML), the override would need to detect the element name and switch the namespace
3. Build and test: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser`
4. Add namespace test cases to `src/parser.spec.ts`:
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

### 4. Updating the spread-attribute brace matcher

When a new edge case is reported for `{...EXPR}` parsing (a previously
unconsidered string syntax, comment style, or escape sequence):

1. Reproduce the edge case as a `findMatchingBrace()` unit test in
   `src/spread-attr.spec.ts` — the test should fail before any fix.
2. Decide where the fix belongs:
   - **String / template / quote handling** → extend the `inString` switch in
     `findMatchingBrace()`
   - **Comment handling** → extend the `//` / `/* */` branches
   - **Escape sequence parity** → extend `countPrecedingBackslashes()`
3. Apply the minimum change that turns the failing unit test green; avoid
   introducing a full JavaScript lexer.
4. If the new case is not naturally expressible as a standalone unit test,
   add an integration test in `parser.spec.ts` under the `#3856` describe.
5. Update the **Known limitations** list in `src/spread-attr.ts` JSDoc if the
   matcher still cannot handle the case (e.g., regex literals).
6. Verify: `yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser && yarn lint`.

## Upstream Impact Checklist

Changes to upstream packages can affect this parser:

| Package                                  | Impact                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@markuplint/parser-utils`               | Base `Parser` class changes affect all override methods                                                            |
| `@markuplint/parser-utils/script-parser` | If TS support and non-greedy parsing land here, `src/spread-attr.ts` and the `visitAttr()` pre-pass can be removed |
| `@markuplint/ml-ast`                     | AST type changes affect `nodeize()` return types                                                                   |
| `astro-eslint-parser`                    | Parser output format changes affect `tokenize()` and `nodeize()`                                                   |

When updating `astro-eslint-parser`:

```shell
# Update the runtime dependency
yarn upgrade astro-eslint-parser --scope @markuplint/astro-parser

# Update the dev dependency for types
yarn upgrade @astrojs/compiler --scope @markuplint/astro-parser --dev

# Verify compatibility
yarn build --scope @markuplint/astro-parser && yarn test --scope @markuplint/astro-parser
```

### Porting fixes from v4

When forward-porting an `astro-parser` fix from the `v4` branch to `dev`, beware
the `Token` field rename: v4 uses `startOffset` / `startLine` / `startCol`;
dev uses the short forms `offset` / `line` / `col`. The same rename also
applies to AST node properties asserted in `*.spec.ts`. Build will surface
the issue as `TS2339` on the renamed properties.

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

**Cause:** Namespace resolution is handled by the base `Parser` class from `@markuplint/parser-utils`. The Astro parser does not override namespace logic.

**Solution:**

1. Check whether the issue is in the base `Parser` class in `@markuplint/parser-utils`
2. Add a test case with the specific nesting pattern to `src/parser.spec.ts` to confirm expected behavior
3. If the issue is upstream, investigate the base `Parser` namespace handling

### Template directive not detected

**Symptom:** An attribute like `set:html={content}` does not get `isDirective: true`, or `class:list` does not get `potentialName: 'class'`.

**Cause:** The regex `/^([^:]+):([^:]+)$/` did not match, or the switch case is missing.

**Solution:**

1. Verify the attribute name format — the regex requires exactly one colon with non-empty parts on both sides
2. Check the `switch (lowerCaseDirectiveName)` — the directive prefix must match a case
3. If it is a new directive prefix, add a new case (see Recipe #1)

### Spread attribute is truncated, or `Invalid tag syntax` is thrown for `{...EXPR}` followed by an expression child

**Symptom:** Either of the following:

- `{...{ command: 'close' } as any}` is split into a partial spread plus bogus `as` / `any}` attributes.
- `<div {...props}>{label}</div>` (or any element with a spread attribute followed immediately by an expression child like `{label}`) throws `SyntaxError: Invalid tag syntax: ...`.

**Cause:** The element's raw token is being routed through `parser-utils/safeScriptParser` (espree-based) instead of the brace-aware extractor in `src/spread-attr.ts`. `safeScriptParser` does not understand TypeScript syntax (`as`) and may extend a "valid JS prefix" past the spread's `}` into the surrounding HTML (interpreting `{...props}>{label}` as a binary `>` expression).

**Solution:**

1. Confirm `src/parser.ts` `visitAttr()` calls `extractSpreadAttribute()` from `./spread-attr.js` _before_ `super.visitAttr()`. The order matters — falling through to the base path is what triggers the bug.
2. If a new edge case is reported, reproduce it as a unit test in `src/spread-attr.spec.ts` with `findMatchingBrace()` and decide whether the brace matcher needs an additional escape rule (string / template / comment / backslash).
3. Known limitations are listed in `src/spread-attr.ts` JSDoc — regular-expression literals containing braces are not handled. Document any additional limitations there.

See [#3824](https://github.com/markuplint/markuplint/issues/3824) (v4) and [#3856](https://github.com/markuplint/markuplint/issues/3856) (dev/v5) for the original report and the rationale for handling spread attributes locally instead of in `parser-utils`.
