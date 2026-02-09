---
description: Perform maintenance tasks for @markuplint/ejs-parser
globs:
  - packages/@markuplint/ejs-parser/src/**
alwaysApply: false
---

# @markuplint/ejs-parser Maintenance

You are maintaining `@markuplint/ejs-parser`, the EJS template parser for markuplint.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full architecture overview including the ignoreTags mechanism and integration points.

For detailed maintenance procedures, see [docs/maintenance.md](docs/maintenance.md) ([Japanese](docs/maintenance.ja.md)).

## Key Files

| File            | Role                                          |
| --------------- | --------------------------------------------- |
| `src/parser.ts` | EJSParser class with ignoreTags configuration |
| `src/index.ts`  | Package entry point; re-exports parser        |

## Tasks

### add-ignore-tag

Add a new EJS tag variant to the ignoreTags configuration.

1. Open `src/parser.ts`
2. Add a new entry to the `ignoreTags` array in the `EJSParser` constructor
   - Place it **before** `ejs-scriptlet` (the catch-all pattern must remain last)
   - Use a string for the `start` delimiter if it is a fixed prefix
   - Use a regex for `start` only if pattern matching is needed
3. Add a test case in `src/index.spec.ts` under the `Tags` describe block:
   ```ts
   test('new-type-name', () => {
     expect(parse('<new-delimiter any %>').nodeList[0].nodeName).toBe('#ps:new-type-name');
   });
   ```
4. Build: `yarn build --scope @markuplint/ejs-parser`
5. Test: `yarn test --scope @markuplint/ejs-parser`

### modify-ignore-tag

Modify an existing EJS tag pattern (start/end delimiter or type name).

1. Open `src/parser.ts`
2. Find the target entry in the `ignoreTags` array and update `type`, `start`, or `end`
3. Update affected test cases in `src/index.spec.ts`
   - Check both `Tags` tests (nodeName assertions) and `Node list` tests (debug map snapshots)
4. Build: `yarn build --scope @markuplint/ejs-parser`
5. Test: `yarn test --scope @markuplint/ejs-parser`
