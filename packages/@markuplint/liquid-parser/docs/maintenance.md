# Maintenance Guide

## Commands

| Command                                        | Description            |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/liquid-parser` | Build this package     |
| `yarn dev --scope @markuplint/liquid-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/liquid-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/liquid-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                        |
| --------------- | --------------------------------------------------------------- |
| `index.spec.ts` | Verifies each ignoreTags entry produces the correct `#ps:` node |

The primary testing pattern parses a template string and checks the resulting node name:

```ts
import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:liquid-block');
expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:liquid-output');
```

## Recipes

### 1. Adding a New ignoreTags Entry

Use this recipe when Liquid introduces new syntax that needs to be treated as an opaque block.

1. Open `src/parser.ts`
2. Add a new object to the `ignoreTags` array in the `LiquidParser` constructor:
   ```ts
   {
     type: 'liquid-<name>',
     start: '<start-delimiter>',
     end: '<end-delimiter>',
   },
   ```
3. Open `src/index.spec.ts` and add a test:
   ```ts
   test('liquid-<name>', () => {
     expect(parse('<start-delimiter> any <end-delimiter>').nodeList[0]?.nodeName).toBe('#ps:liquid-<name>');
   });
   ```
4. Build and test:
   ```shell
   yarn build --scope @markuplint/liquid-parser && yarn test --scope @markuplint/liquid-parser
   ```

### 2. Modifying an Existing ignoreTags Entry

Use this recipe to change delimiters or rename an ignoreTags type.

1. Open `src/parser.ts` and locate the entry to modify in the `ignoreTags` array
2. Update the `type`, `start`, or `end` fields as needed
3. Update the corresponding test in `src/index.spec.ts` to match the new values
4. Build and test:
   ```shell
   yarn build --scope @markuplint/liquid-parser && yarn test --scope @markuplint/liquid-parser
   ```

**Note:** Changing the `type` name changes the `#ps:` node name in the AST. Downstream consumers that match on specific node names will need to be updated.

## Upstream Dependency

This package depends entirely on `@markuplint/html-parser` for its parsing behavior. If the `ignoreTags` mechanism in `HtmlParser` changes, this parser may be affected.

To test with the upstream package:

```shell
yarn build --scope @markuplint/html-parser --scope @markuplint/liquid-parser
yarn test --scope @markuplint/liquid-parser
```

## Troubleshooting

### Liquid expression is parsed as HTML instead of an opaque block

**Symptom:** A Liquid tag like `{% if condition %}` produces HTML parse errors or is not recognized as a `#ps:liquid-block` node.

**Cause:** The `start` or `end` delimiters in the `ignoreTags` entry do not match the syntax in the source.

**Solution:**

1. Check `src/parser.ts` -- verify the `start` and `end` strings exactly match the Liquid delimiters
2. Ensure there are no whitespace issues in the delimiter strings
3. Run the test suite to confirm: `yarn test --scope @markuplint/liquid-parser`

### New ignoreTags entry is not recognized

**Symptom:** After adding a new entry, the parser still treats the syntax as HTML.

**Cause:** The build output is stale.

**Solution:**

1. Rebuild: `yarn build --scope @markuplint/liquid-parser`
2. Verify the entry appears in `lib/parser.js`
3. Run tests: `yarn test --scope @markuplint/liquid-parser`
