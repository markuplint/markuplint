---
description: Perform maintenance tasks for @markuplint/liquid-parser
globs:
  - packages/@markuplint/liquid-parser/src/**
alwaysApply: false
---

# liquid-parser-maintenance

Perform maintenance tasks for `@markuplint/liquid-parser`: add new ignoreTags entries
for additional Liquid syntax, or modify existing ignoreTags configuration.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                | Description                                  |
| ------------------- | -------------------------------------------- |
| `add-ignore-tag`    | Add a new ignoreTags entry for Liquid syntax |
| `modify-ignore-tag` | Modify an existing ignoreTags entry          |

If omitted, defaults to `add-ignore-tag`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ignoreTags mechanism, and integration points
- `src/parser.ts` -- LiquidParser class (source of truth for ignoreTags configuration)

## Task: add-ignore-tag

Add a new ignoreTags entry for additional Liquid syntax. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Identify the syntax

1. Determine the start and end delimiters for the new Liquid syntax
2. Choose a descriptive `type` name with a `liquid-` prefix (e.g., `liquid-comment`)

### Step 2: Add the entry

1. Read `src/parser.ts`
2. Add a new object to the `ignoreTags` array in the `LiquidParser` constructor:
   ```ts
   {
     type: 'liquid-<name>',
     start: '<start-delimiter>',
     end: '<end-delimiter>',
   },
   ```

### Step 3: Add tests

1. Read `src/index.spec.ts`
2. Add a test case verifying the new tag is parsed as `#ps:liquid-<name>`

### Step 4: Verify

1. Build: `yarn build --scope @markuplint/liquid-parser`
2. Test: `yarn test --scope @markuplint/liquid-parser`

## Task: modify-ignore-tag

Modify an existing ignoreTags entry. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Identify the entry

1. Read `src/parser.ts` and find the ignoreTags entry to modify
2. Understand the current start/end delimiters and type name

### Step 2: Make the change

1. Update the `type`, `start`, or `end` fields as needed
2. If changing the `type` name, update the corresponding test in `src/index.spec.ts`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/liquid-parser`
2. Test: `yarn test --scope @markuplint/liquid-parser`

## Rules

1. **Use the `liquid-` prefix** for all ignoreTags type names to maintain consistency.
2. **Add a test case** for every new ignoreTags entry.
3. **Add JSDoc comments** to document any new public exports.
4. **Keep the parser minimal** -- all parsing logic is handled by the upstream `HtmlParser` via `ignoreTags`. Do not add custom parsing methods unless absolutely necessary.
