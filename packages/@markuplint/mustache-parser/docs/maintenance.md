# Maintenance Guide

## Commands

| Command                                          | Description            |
| ------------------------------------------------ | ---------------------- |
| `yarn build --scope @markuplint/mustache-parser` | Build this package     |
| `yarn dev --scope @markuplint/mustache-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/mustache-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/mustache-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                       |
| --------------- | -------------------------------------------------------------- |
| `index.spec.ts` | Tag recognition, node list structure, block helpers, bare text |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{{ name }}</div>');
expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:15](5,14)#ps:mustache-tag: {{␣name␣}}',
  '[1:15]>[1:21](14,20)div: </div>',
]);
```

Individual tag type assertions:

```ts
expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-tag');
expect(parse('{{{ any }}}').nodeList[0]?.nodeName).toBe('#ps:mustache-unescaped');
expect(parse('{{! any }}').nodeList[0]?.nodeName).toBe('#ps:mustache-comment');
```

## Recipes

### 1. Adding or Modifying an ignoreTags Entry

1. Read `src/parser.ts` and review the `ignoreTags` array in the `MustacheParser` constructor
2. Add or modify the entry, preserving correct ordering:
   - More specific start delimiters must appear before less specific ones
   - Current order: `{{!` -> `{{{` -> `{{`
3. Each entry requires: `type` (string identifier), `start` (opening delimiter), `end` (closing delimiter)
4. Build: `yarn build --scope @markuplint/mustache-parser`
5. Add test cases to `src/index.spec.ts` to verify the new tag type produces the correct `#ps:*` node name
6. Test: `yarn test --scope @markuplint/mustache-parser`

### 2. Fixing a Parsing Issue

1. Create a minimal reproducing template and write a failing test in `src/index.spec.ts`
2. Determine whether the issue is in:
   - **ignoreTags configuration** (this package) -- delimiter matching, ordering
   - **Base HTML parser** (`@markuplint/html-parser`) -- HTML structure handling
3. Apply the fix in the appropriate package
4. Build and test: `yarn build --scope @markuplint/mustache-parser && yarn test --scope @markuplint/mustache-parser`
5. If the fix is in `@markuplint/html-parser`, also run: `yarn test --scope @markuplint/html-parser`

### 3. Adding Test Cases

1. Read `src/index.spec.ts` to understand the existing test structure
2. For node list tests, use the `nodeListToDebugMaps` pattern:
   ```ts
   const doc = parse('template string here');
   expect(nodeListToDebugMaps(doc.nodeList)).toStrictEqual([...]);
   ```
3. For tag type tests, assert against `nodeName`:
   ```ts
   expect(parse('{{ expr }}').nodeList[0]?.nodeName).toBe('#ps:mustache-tag');
   ```
4. Test: `yarn test --scope @markuplint/mustache-parser`

## Upstream Impact

This package depends on `@markuplint/html-parser`. Changes in `HtmlParser` (especially `ignoreTags` processing, `visitText`, or the `researchTags` mechanism) may affect this parser.

When `@markuplint/html-parser` is updated, run:

```shell
yarn test --scope @markuplint/mustache-parser
```

## Troubleshooting

### Mustache tags are not recognized

**Symptom:** Mustache expressions like `{{ name }}` appear as raw text instead of `#ps:mustache-tag` nodes.

**Cause:** The `ignoreTags` entry is missing or the start/end delimiters are incorrect.

**Solution:**

1. Check `src/parser.ts` -- verify the `ignoreTags` array includes an entry with `start: '{{'` and `end: '}}'`
2. Verify the entry ordering -- more specific patterns must appear first

### Triple-stache parsed as double-stache

**Symptom:** `{{{ raw }}}` produces a `#ps:mustache-tag` node instead of `#ps:mustache-unescaped`.

**Cause:** The `mustache-unescaped` entry (`{{{` / `}}}`) appears after the `mustache-tag` entry (`{{` / `}}`), so the less specific pattern matches first.

**Solution:**

1. Move the `mustache-unescaped` entry before the `mustache-tag` entry in the `ignoreTags` array

### Comment tags parsed as regular tags

**Symptom:** `{{! comment }}` produces a `#ps:mustache-tag` node instead of `#ps:mustache-comment`.

**Cause:** The `mustache-comment` entry (`{{!` / `}}`) appears after the `mustache-tag` entry (`{{` / `}}`).

**Solution:**

1. Ensure the `mustache-comment` entry is listed before the `mustache-tag` entry in the `ignoreTags` array
