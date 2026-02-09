# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/ejs-parser` | Build this package     |
| `yarn dev --scope @markuplint/ejs-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/ejs-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/ejs-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| `index.spec.ts` | EJSParser integration tests (node list structure, tag type detection, etc.) |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div><%= value %></div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:18](5,17)#ps:ejs-output-value: <%=␣value␣%>',
  '[1:18]>[1:24](17,23)div: </div>',
]);
```

Tag type detection tests verify that each EJS variant produces the correct `#ps:*` node name:

```ts
expect(parse('<%_ any _%>').nodeList[0].nodeName).toBe('#ps:ejs-whitespace-slurping');
expect(parse('<%= any %>').nodeList[0].nodeName).toBe('#ps:ejs-output-value');
expect(parse('<%- any -%>').nodeList[0].nodeName).toBe('#ps:ejs-output-unescaped');
expect(parse('<%# any %>').nodeList[0].nodeName).toBe('#ps:ejs-comment');
expect(parse('<% any %>').nodeList[0].nodeName).toBe('#ps:ejs-scriptlet');
```

## Recipes

### 1. Adding an ignoreTags Pattern

When a new EJS tag variant needs to be supported:

1. Open `src/parser.ts`
2. Add a new entry to the `ignoreTags` array in the constructor:
   ```ts
   {
     type: 'ejs-new-variant',
     start: '<%X',
     end: '%>',
   },
   ```
3. **Ordering matters** — Place the new entry before `ejs-scriptlet`. The `ejs-scriptlet` pattern uses a catch-all regex (`/<%(?!%)/`) and must remain last to avoid matching more specific patterns
4. Add a tag detection test in `src/index.spec.ts`:
   ```ts
   test('ejs-new-variant', () => {
     expect(parse('<%X any %>').nodeList[0].nodeName).toBe('#ps:ejs-new-variant');
   });
   ```
5. Add a node list integration test if the new variant has special parsing behavior
6. Build: `yarn build --scope @markuplint/ejs-parser`
7. Test: `yarn test --scope @markuplint/ejs-parser`

### 2. Modifying an ignoreTags Pattern

When changing a start/end delimiter or renaming a type:

1. Open `src/parser.ts` and find the target entry in `ignoreTags`
2. Modify the `type`, `start`, or `end` fields as needed
3. Update all affected tests in `src/index.spec.ts`:
   - **Tag type tests** (`Tags` describe block) — update the `nodeName` assertions
   - **Node list tests** (`Node list` describe block) — update the `#ps:*` entries in debug map snapshots
4. Build: `yarn build --scope @markuplint/ejs-parser`
5. Test: `yarn test --scope @markuplint/ejs-parser`

## Downstream Impact

This package is a leaf parser — no other packages depend on it. Changes to `@markuplint/ejs-parser` do not require testing downstream packages.
