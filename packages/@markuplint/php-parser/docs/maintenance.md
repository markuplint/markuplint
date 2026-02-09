# Maintenance Guide

## Commands

| Command                                     | Description            |
| ------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/php-parser` | Build this package     |
| `yarn dev --scope @markuplint/php-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/php-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/php-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| `index.spec.ts` | PHPParser integration tests (echo tags, short tags, unclosed tags at EOF) |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div><?= name ?></div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

### Tag type assertions

Each PHP tag variant has a dedicated test verifying its `#ps:*` node name:

```ts
expect(parse('<?php any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-tag');
expect(parse('<?= any ?>').nodeList[0]?.nodeName).toBe('#ps:php-echo');
expect(parse('<? any; ?>').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
```

### EOF-unclosed tag tests

The test suite verifies that PHP tags without a closing `?>` are correctly captured:

```ts
expect(parse('<?php any;').nodeList[0]?.nodeName).toBe('#ps:php-tag');
expect(parse('<? any;').nodeList[0]?.nodeName).toBe('#ps:php-short-tag');
```

## Recipes

### 1. Adding a New PHP Tag Variant

1. Open `src/parser.ts`
2. Add a new entry to the `ignoreTags` array:
   - Place it **before** `php-short-tag` (the most generic `<?` pattern must remain last)
   - Use a string for `start` if the delimiter is a fixed prefix
   - Use `/\?>|$/` for `end` if the tag may remain unclosed at EOF; use `?>` if the tag is always closed
3. Add test cases in `src/index.spec.ts`:
   - A `Tags` test verifying the `#ps:*` node name
   - A `Node list` test verifying the debug map output with surrounding HTML
4. Build: `yarn build --scope @markuplint/php-parser`
5. Test: `yarn test --scope @markuplint/php-parser`

### 2. Modifying an Existing Tag Pattern

1. Open `src/parser.ts`
2. Find the target entry in the `ignoreTags` array and update `type`, `start`, or `end`
3. Update affected test cases in `src/index.spec.ts`:
   - Check both `Tags` tests (nodeName assertions) and `Node list` tests (debug map snapshots)
4. Build: `yarn build --scope @markuplint/php-parser`
5. Test: `yarn test --scope @markuplint/php-parser`

### 3. Updating the Upstream HtmlParser Dependency

1. Update the `@markuplint/html-parser` dependency in `package.json`
2. Build: `yarn build --scope @markuplint/php-parser`
3. Test: `yarn test --scope @markuplint/php-parser`
4. If tests fail, check the `HtmlParser` changelog for breaking changes in the `ignoreTags` mechanism

## Troubleshooting

### PHP tag is not recognized

**Symptom:** A PHP tag appears as raw text in the AST instead of a `#ps:*` node.

**Cause:** The `start` delimiter does not match the input, or a more specific pattern matched first.

**Solution:**

1. Check the ordering of `ignoreTags` — more specific patterns (e.g., `<?php`) must appear before less specific ones (e.g., `<?`)
2. Verify the `start` string matches the exact characters in the input

### Unclosed PHP tag consumes the rest of the file

**Symptom:** A PHP tag that should be closed by `?>` instead extends to the end of the file.

**Cause:** The `end` pattern uses `/\?>|$/` and the `?>` is not being matched correctly.

**Solution:**

1. Verify the `?>` is not inside a PHP string literal or comment (this parser does not analyze PHP syntax — it only matches delimiters)
2. Check that the `end` regex is correct: `/\?>|$/` (the `\?` must be escaped)
