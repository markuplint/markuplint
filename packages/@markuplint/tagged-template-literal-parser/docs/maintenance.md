# Maintenance Guide

## Commands

| Command                                                              | Description            |
| -------------------------------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/tagged-template-literal-parser`      | Build this package     |
| `yarn dev --scope @markuplint/tagged-template-literal-parser`        | Watch mode build       |
| `yarn clean --scope @markuplint/tagged-template-literal-parser`      | Remove build artifacts |
| `npx vitest run packages/@markuplint/tagged-template-literal-parser` | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File                        | Coverage                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `index.spec.ts`                  | Parser integration tests (node list structure, expressions, attributes, etc.) |
| `find-template-literals.spec.ts` | Template literal extraction unit tests (tag detection, expression positions)  |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('const t = html`<div>${name}</div>`;');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:16]>[1:21](15,20)div: <div>',
  '[1:21]>[1:28](20,27)#ps:ttl-expression: ${name}',
  '[1:28]>[1:34](27,33)div: </div>',
]);
```

Template literal extraction tests verify that tagged templates are correctly found and positions are accurate:

```ts
import { findTemplateLiterals } from './find-template-literals.js';

const results = findTemplateLiterals('const t = html`<div></div>`;');
expect(results).toHaveLength(1);
expect(results[0].tagName).toBe('html');
expect(results[0].htmlContent).toBe('<div></div>');
```

## Recipes

### 1. Adding a Default Tag Name

When a new tag function name needs to be supported by default:

1. Open `src/parser.ts`
2. Modify the constructor default parameter to include the new tag:
   ```ts
   constructor(tagNames: readonly string[] = ['html', 'svg']) {
   ```
3. Add a test in `src/find-template-literals.spec.ts`:
   ```ts
   test('finds svg tagged template by default', () => {
     const results = findTemplateLiterals('const t = svg`<circle />`;', ['svg']);
     expect(results).toHaveLength(1);
   });
   ```
4. Add an integration test in `src/index.spec.ts`
5. Build: `yarn build --scope @markuplint/tagged-template-literal-parser`
6. Test: `npx vitest run packages/@markuplint/tagged-template-literal-parser/src/`

### 2. Adding a New Tag Resolution Pattern

When a new tag expression form needs to be recognized (e.g., call expressions):

1. Open `src/find-template-literals.ts`
2. Add a new case to the `resolveTagName` function:
   ```ts
   case AST_NODE_TYPES.CallExpression: {
     // Handle html(options)`...` patterns
     return resolveTagName(tag.callee);
   }
   ```
3. Add a test in `src/find-template-literals.spec.ts`
4. Add an integration test in `src/index.spec.ts`
5. Build and test as above

### 3. Modifying Expression Handling

When changing how `${...}` expressions are masked or restored:

1. Open `src/parser.ts` and find the `ignoreTags` array in the constructor
2. Modify the `type`, `start`, or `end` fields as needed
3. Update all affected tests in `src/index.spec.ts`:
   - Search for `#ps:ttl-expression` and update to the new type name
4. Build and test as above

## Downstream Impact

This package is a leaf parser — no other packages depend on it. Changes to `@markuplint/tagged-template-literal-parser` do not require testing downstream packages.
