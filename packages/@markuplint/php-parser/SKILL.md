---
description: Perform maintenance tasks for @markuplint/php-parser
globs:
  - packages/@markuplint/php-parser/src/**
alwaysApply: false
---

# @markuplint/php-parser Maintenance

You are maintaining `@markuplint/php-parser`, the PHP template parser for markuplint.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture overview including the ignoreTags mechanism and integration points.

For detailed maintenance procedures, see [docs/maintenance.md](docs/maintenance.md) ([Japanese](docs/maintenance.ja.md)).

## Key Files

| File            | Role                                          |
| --------------- | --------------------------------------------- |
| `src/parser.ts` | PHPParser class with ignoreTags configuration |
| `src/index.ts`  | Package entry point; re-exports parser        |

## Tasks

### add-ignore-tag

Add a new PHP tag variant to the ignoreTags configuration.

1. Open `src/parser.ts`
2. Add a new entry to the `ignoreTags` array in the `PHPParser` constructor
   - Place it **before** `php-short-tag` (the most generic pattern must remain last)
   - Use a string for the `start` delimiter if it is a fixed prefix
   - Use `/\?>|$/` for `end` if the tag may be unclosed at EOF; use `?>` if the tag is always closed
3. Add a test case in `src/index.spec.ts` under the `Tags` describe block:
   ```ts
   test('new-type-name', () => {
     expect(parse('<new-delimiter any ?>').nodeList[0]?.nodeName).toBe('#ps:new-type-name');
   });
   ```
4. Build: `yarn build --scope @markuplint/php-parser`
5. Test: `yarn test --scope @markuplint/php-parser`

### modify-ignore-tag

Modify an existing PHP tag pattern (start/end delimiter or type name).

1. Open `src/parser.ts`
2. Find the target entry in the `ignoreTags` array and update `type`, `start`, or `end`
3. Update affected test cases in `src/index.spec.ts`
   - Check both `Tags` tests (nodeName assertions) and `Node list` tests (debug map snapshots)
4. Build: `yarn build --scope @markuplint/php-parser`
5. Test: `yarn test --scope @markuplint/php-parser`
