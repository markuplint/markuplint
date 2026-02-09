# Maintenance Guide

## Commands

| Command                                        | Description            |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/smarty-parser` | Build this package     |
| `yarn dev --scope @markuplint/smarty-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/smarty-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/smarty-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File       | Coverage                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------- |
| `index.spec.ts` | SmartyParser integration tests (scriptlets, comments, literal blocks, nested blocks, full HTML) |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from './parser.js';

const doc = parser.parse('<div>{ title }</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList);
expect(debugMaps).toStrictEqual([
  '[1:1]>[1:6](0,5)div: <div>',
  '[1:6]>[1:15](5,14)#ps:smarty-scriptlet: {␣title␣}',
  '[1:15]>[1:21](14,20)div: </div>',
]);
```

Node names for each tag type:

| ignoreTags Type    | AST Node Name          |
| ------------------ | ---------------------- |
| `smarty-literal`   | `#ps:smarty-literal`   |
| `smarty-comment`   | `#ps:smarty-comment`   |
| `smarty-scriptlet` | `#ps:smarty-scriptlet` |

## Recipes

### 1. Adding or Modifying an ignoreTags Pattern

1. Read `src/parser.ts` and review the existing `ignoreTags` array
2. Add the new entry or modify an existing one:
   - `type`: A descriptive name prefixed with `smarty-`
   - `start`: The opening delimiter (string or regex)
   - `end`: The closing delimiter (string)
3. Ensure proper ordering: more specific patterns (longer start delimiters) must come before less specific ones. For example, `{literal}` before `{`
4. Build: `yarn build --scope @markuplint/smarty-parser`
5. Add test cases to `src/index.spec.ts`
6. Test: `yarn test --scope @markuplint/smarty-parser`

### 2. Fixing a Parsing Issue

1. Create a minimal Smarty template that reproduces the issue
2. Write a failing test case in `src/index.spec.ts` using `nodeListToDebugMaps`
3. Common causes:
   - **Wrong ordering** -- A generic pattern (`{`) matches before a specific one (`{literal}`)
   - **Greedy matching** -- A delimiter consumes too much text
   - **Base parser issue** -- The problem is in `@markuplint/html-parser` or `@markuplint/parser-utils`, not here
4. Fix the issue in `src/parser.ts`
5. Build and test: `yarn build --scope @markuplint/smarty-parser && yarn test --scope @markuplint/smarty-parser`

### 3. Adding Test Cases

1. Read `src/index.spec.ts` for existing patterns
2. Use `nodeListToDebugMaps()` to generate debug output
3. Verify node names match the expected `#ps:smarty-*` pattern
4. Common Smarty patterns to test:
   - Variables: `{$name}`, `{$user.name}`
   - Modifiers: `{$name|escape}`, `{$date|date_format:"%Y"}`
   - Functions: `{include file='header.tpl'}`, `{assign var='x' value='y'}`
   - Block tags: `{if $cond}...{/if}`, `{foreach $items as $item}...{/foreach}`
   - Comments: `{* this is a comment *}`
   - Literal blocks: `{literal}...{/literal}`

## Upstream Dependency

This package depends solely on `@markuplint/html-parser`. Changes to `HtmlParser`'s `ignoreTags` mechanism or the base `Parser` class may affect this package.

When `@markuplint/html-parser` is updated:

```shell
yarn build --scope @markuplint/smarty-parser && yarn test --scope @markuplint/smarty-parser
```

## Troubleshooting

### Smarty expressions are not detected

**Symptom:** Smarty tags like `{$variable}` appear as plain text instead of `#ps:smarty-scriptlet` nodes.

**Cause:** The `ignoreTags` pattern is not matching. The start or end delimiter may be incorrect.

**Solution:**

1. Check the `ignoreTags` array in `src/parser.ts`
2. Verify the start/end delimiters match the Smarty syntax in question
3. Add a test case reproducing the issue

### Wrong tag type is assigned

**Symptom:** A `{* comment *}` is detected as `#ps:smarty-scriptlet` instead of `#ps:smarty-comment`.

**Cause:** Pattern ordering issue. The generic `{` pattern is matching before the more specific `{*` pattern.

**Solution:**

1. Ensure more specific patterns appear earlier in the `ignoreTags` array
2. The correct order is: `smarty-literal` > `smarty-comment` > `smarty-scriptlet`

### Literal blocks are not handled correctly

**Symptom:** Content inside `{literal}...{/literal}` is parsed as Smarty expressions.

**Cause:** The `smarty-literal` pattern is not matching, or it appears after `smarty-scriptlet` in the array.

**Solution:**

1. Verify `smarty-literal` is the first entry in `ignoreTags`
2. Check that start is exactly `{literal}` and end is exactly `{/literal}`
