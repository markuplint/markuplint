# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/vue-parser` | Build this package     |
| `yarn dev --scope @markuplint/vue-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/vue-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/vue-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                               |
| --------------- | -------------------------------------------------------------------------------------- |
| `index.spec.ts` | VueParser integration tests (parsing, directives, namespaces, element types, comments) |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/vue-parser';

const doc = parser.parse('<template><div class="foo">text</div></template>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

To test attribute metadata (directives, potentialName, isDynamicValue):

```ts
const doc = parser.parse('<template><div v-bind:title="val"></div></template>');
expect(doc.nodeList[0].attributes[0].potentialName).toBe('title');
expect(doc.nodeList[0].attributes[0].isDynamicValue).toBeTruthy();
```

To test element types:

```ts
const doc = parser.parse('<template><MyComponent/></template>');
expect(doc.nodeList[0].elementType).toBe('authored');
```

## Recipes

### 1. Adding or Modifying a Vue Directive

1. Read `src/parser.ts` and find the `visitAttr()` method
2. Identify the correct position in the priority chain:
   - `v-on` / `@` (event binding) — first
   - `v-bind` / `:` (property binding) — second
   - `v-model` — third
   - `v-slot` / `#` — fourth
   - Generic `v-*` — last (catch-all)
3. Create a new scoped block with a regex pattern:
   ```ts
   {
     const [, directive, name] = attr.name.raw.match(/^(v-newdir:|shorthand)(.+)$/i) ?? [];
     if (directive && name) {
       return {
         ...attr,
         potentialName: name, // if it maps to an HTML attribute
         isDirective: true as const, // if it's Vue-only
         isDynamicValue: true as const, // if value is JavaScript
       };
     }
   }
   ```
4. Build: `yarn build --scope @markuplint/vue-parser`
5. Add tests to `src/index.spec.ts`:
   - Full form: `v-newdir:value`
   - Shorthand form if applicable
   - With modifiers if applicable
6. Test: `yarn test --scope @markuplint/vue-parser`

### 2. Modifying Element Type Detection

1. Read `src/parser.ts` and find the `detectElementType()` method
2. The matcher array supports:
   - **String literals** — exact match (e.g., `'Transition'`, `'component'`, `'slot'`)
   - **RegExp** — pattern match (e.g., `/^[A-Z]/` for PascalCase)
3. To add a new Vue built-in component:
   ```ts
   detectElementType(nodeName: string) {
     return super.detectElementType(nodeName, [
       // Built-in components
       'Transition',
       'TransitionGroup',
       'KeepAlive',
       'Teleport',
       'Suspense',
       'NewBuiltIn',  // <-- add here
       // Special elements
       'component',
       'slot',
       // Backward compatibility
       /^[A-Z]/,
     ]);
   }
   ```
4. Build and test: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`
5. Add test cases to the `elementType` test block in `src/index.spec.ts`

### 3. Updating vue-eslint-parser Version Support

1. Read `src/vue-parser/index.ts` — this is the wrapper around vue-eslint-parser
2. Check the vue-eslint-parser release notes for breaking changes
3. Key integration points:
   - `VueESLintParser.parse(vueTemplate, { parser: false })` — main parse call
   - `ast.templateBody?.children` — template child nodes
   - `ast.templateBody?.comments` — template comments
   - `VueESLintParser.AST.VElement` / `VText` / `VExpressionContainer` — node types
4. Update type exports if AST types changed:
   ```ts
   export type ASTNode =
     | VueESLintParser.AST.VElement
     | VueESLintParser.AST.VText
     | VueESLintParser.AST.VExpressionContainer;
   ```
5. Build and test: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`

### 4. Fixing Template Comment Injection

1. Read the `flattenNodes()` method in `src/parser.ts`
2. The comment injection logic:
   - Comments are stored in `this.state.comments` during `tokenize()`
   - During flattening, for each pair of adjacent nodes, the method checks if a comment falls between them
   - The range check: `lastOffset <= comment.range[0] && comment.range[1] <= node.startOffset`
3. Common issues:
   - Comment not injected: check that the range check covers the gap correctly
   - Comment at wrong position: check `lastOffset` calculation (`prevNode?.endOffset ?? node.parentNode?.endOffset ?? 0`)
   - Bogus comment detection: verify `betweenComment.type === 'HTMLBogusComment'`
4. Build and test: `yarn build --scope @markuplint/vue-parser && yarn test --scope @markuplint/vue-parser`

## Upstream Impact Checklist

Changes to upstream packages can affect this package:

| Package                    | Impact                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| `@markuplint/parser-utils` | Base `Parser` class changes may affect all override methods                   |
| `@markuplint/ml-ast`       | AST type changes may require updates to nodeize() return types                |
| `vue-eslint-parser`        | AST structure changes may require updates to tokenize(), nodeize(), and types |

When upstream packages change, run:

```shell
yarn test --scope @markuplint/vue-parser
```

## Troubleshooting

### Vue directive is not recognized

**Symptom:** A Vue directive like `v-custom` is treated as a regular HTML attribute instead of being marked as `isDirective: true`.

**Cause:** The directive pattern does not match in `visitAttr()`, or the new directive block is placed after the generic `v-*` catch-all.

**Solution:**

1. Check the regex pattern in your directive block — ensure it matches the full attribute name
2. Ensure the block is placed before the generic `v-*` catch-all at the end of `visitAttr()`
3. Verify the return object includes `isDirective: true as const`

### Template comments are missing from the AST

**Symptom:** HTML comments (`<!-- ... -->`) in the Vue template are not present in the parsed node list.

**Cause:** The comments are not being injected during `flattenNodes()`, or they are not captured during `tokenize()`.

**Solution:**

1. Check `tokenize()` — verify `ast.templateBody?.comments` is being stored in `this.state.comments`
2. Check `flattenNodes()` — verify the range check logic finds the comment between adjacent nodes
3. Add a test case with the specific comment position and check `nodeListToDebugMaps` output

### PascalCase component not detected as 'authored'

**Symptom:** A component like `<MyComponent>` has `elementType: 'html'` instead of `'authored'`.

**Cause:** The `/^[A-Z]/` regex in `detectElementType()` is not matching, or the matcher array is misconfigured.

**Solution:**

1. Check that the component name starts with an uppercase letter
2. Verify the `/^[A-Z]/` regex is still present in the matcher array
3. Note that lowercase Vue built-ins like `<component>` and `<slot>` are matched by string, not regex

### SyntaxError not properly reported

**Symptom:** Vue template syntax errors crash the process instead of producing a `ParserError`.

**Cause:** The `parseError()` method is not catching the error, or the error object does not have `lineNumber`/`column` properties.

**Solution:**

1. Check `parseError()` — verify the `instanceof SyntaxError` and `'lineNumber' in error` checks
2. vue-eslint-parser errors include `lineNumber` (1-based) and `column` (0-based)
3. The fallback `super.parseError(error)` handles non-SyntaxError cases
