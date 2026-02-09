# Maintenance Guide

## Commands

| Command                                          | Description            |
| ------------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/nunjucks-parser` | Build this package     |
| `yarn dev --scope @markuplint/nunjucks-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/nunjucks-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/nunjucks-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| `index.spec.ts` | Parser integration tests (block, output, comment tag recognition and nested HTML) |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{% if foo %}<span>{{ bar }}</span>{% endif %}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

For simple tag recognition tests:

```ts
expect(parser.parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-block');
expect(parser.parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-output');
expect(parser.parse('{# any #}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-comment');
```

## Recipes

### 1. Adding or Modifying an ignoreTags Pattern

1. Read `src/parser.ts` and review the `ignoreTags` array
2. Add or modify the entry with `type`, `start`, and `end` properties
3. If patterns share a common prefix, place the more specific pattern first
4. Build: `yarn build --scope @markuplint/nunjucks-parser`
5. Add test cases to `src/index.spec.ts` verifying the new pattern produces the expected `#ps:*` node
6. Test: `yarn test --scope @markuplint/nunjucks-parser`

### 2. Fixing a Parsing Issue

1. Add a failing test case to `src/index.spec.ts` reproducing the issue
2. Determine whether the issue is in the ignoreTags configuration (`src/parser.ts`) or upstream in `@markuplint/html-parser`
3. If upstream, fix it there and test both packages:
   ```shell
   yarn test --scope @markuplint/html-parser --scope @markuplint/nunjucks-parser
   ```
4. If local, adjust the ignoreTags patterns
5. Build and test: `yarn build --scope @markuplint/nunjucks-parser && yarn test --scope @markuplint/nunjucks-parser`

### 3. Adding a Test Case

1. Read `src/index.spec.ts` for existing patterns
2. For tag recognition: assert `nodeName` equals `#ps:nunjucks-block`, `#ps:nunjucks-output`, or `#ps:nunjucks-comment`
3. For complex HTML: use `nodeListToDebugMaps` for full AST snapshot comparison
4. Run: `yarn test --scope @markuplint/nunjucks-parser`

## Upstream Impact

This package depends solely on `@markuplint/html-parser`. Changes to the `HtmlParser` class or its `ignoreTags` mechanism may affect this parser. When upgrading the upstream dependency:

1. Build: `yarn build --scope @markuplint/nunjucks-parser`
2. Test: `yarn test --scope @markuplint/nunjucks-parser`
3. Verify all three expression types (block, output, comment) still parse correctly

## Troubleshooting

### Nunjucks expression not recognized as a preprocessor block

**Symptom:** A Nunjucks expression (e.g., `{% raw %}`) appears as text content instead of a `#ps:nunjucks-block` node.

**Cause:** The ignoreTags pattern does not match the expression's delimiters.

**Solution:**

1. Check `src/parser.ts` -- verify the `start` and `end` delimiters in the ignoreTags entry
2. If the expression uses a variant delimiter, add a new ignoreTags entry or adjust the existing pattern
3. Test with the specific expression that failed

### Nunjucks expression inside an HTML attribute causes parse error

**Symptom:** HTML containing Nunjucks expressions in attribute values (e.g., `class="{{ foo }}"`) produces unexpected AST output.

**Cause:** The ignoreTags masking preserves source positions but the placeholder may interact with HTML attribute parsing.

**Solution:**

1. Reproduce with a minimal test case using `nodeListToDebugMaps`
2. This is typically an upstream `HtmlParser` issue -- check if other template parsers have the same problem
3. If specific to Nunjucks delimiters, file an issue against `@markuplint/html-parser`
