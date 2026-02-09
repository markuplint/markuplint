# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/erb-parser` | Build this package     |
| `yarn dev --scope @markuplint/erb-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/erb-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/erb-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                    |
| --------------- | ----------------------------------------------------------- |
| `index.spec.ts` | ERB tag parsing, mixed HTML/ERB content, escaped delimiters |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const parse = parser.parse.bind(parser);
const doc = parse('<div><%= name %></div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:18](5,17)#ps:erb-ruby-expression: <%=\u2420name\u2420%>',
  '[1:18]>[1:24](17,23)div: </div>',
]);
```

To verify a tag type is correctly recognized:

```ts
expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-expression');
expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:erb-comment');
expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:erb-ruby-code');
```

## Recipes

### 1. Adding a New ignoreTags Pattern

1. Read `src/parser.ts` and review the existing `ignoreTags` array
2. Determine the new tag's `type` name (convention: `erb-<description>`)
3. Define the `start` and `end` patterns:
   - Use a string literal for fixed start sequences (e.g., `'<%='`)
   - Use a regex for patterns requiring lookahead/lookbehind (e.g., `/<%(?!%)/`)
4. Insert the entry in the correct position:
   - More specific patterns must come before general patterns
   - Example: `<%=` before `<%`
5. Add test cases to `src/index.spec.ts`:
   - Verify the node name is `#ps:<type>`
   - Verify it doesn't match escaped delimiters (`<%%`)
6. Build and test:

```shell
yarn build --scope @markuplint/erb-parser && yarn test --scope @markuplint/erb-parser
```

### 2. Modifying an Existing ignoreTags Pattern

1. Read `src/parser.ts` and locate the entry to modify
2. Make the change to `start`, `end`, or `type`
3. Verify pattern ordering is still correct after the change
4. Update test cases in `src/index.spec.ts` if node names changed
5. Build and test:

```shell
yarn build --scope @markuplint/erb-parser && yarn test --scope @markuplint/erb-parser
```

## Downstream Impact

This package has no downstream parser dependencies. It is a leaf parser consumed directly by the markuplint engine, so changes do not affect other parser packages.
