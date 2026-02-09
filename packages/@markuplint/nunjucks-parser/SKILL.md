---
description: Perform maintenance tasks for @markuplint/nunjucks-parser
globs:
  - packages/@markuplint/nunjucks-parser/src/**
alwaysApply: false
---

# nunjucks-parser-maintenance

Perform maintenance tasks for `@markuplint/nunjucks-parser`: modify ignoreTags configuration,
add new Nunjucks syntax patterns, and update tests.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task               | Description                            |
| ------------------ | -------------------------------------- |
| `modify-ignoretag` | Modify or add an ignoreTags pattern    |
| `fix-parsing`      | Fix a parsing issue with Nunjucks HTML |
| `add-test`         | Add a new test case                    |

If omitted, defaults to `modify-ignoretag`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ignoreTags table, and integration points
- `src/parser.ts` -- NunjucksParser class (source of truth for ignore patterns)

## Task: modify-ignoretag

Modify or add an ignoreTags pattern. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the current patterns

1. Read `src/parser.ts` and review the `ignoreTags` array in the constructor
2. Each entry has `type` (node name), `start` (opening delimiter), and `end` (closing delimiter)

### Step 2: Make the change

1. Add or modify entries in the `ignoreTags` array
2. If the new pattern overlaps with existing patterns, place the more specific pattern first
3. Use a regex string for `start` if a simple string match is insufficient

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/nunjucks-parser`
2. Add test cases to `src/index.spec.ts`
3. Test: `yarn test --scope @markuplint/nunjucks-parser`

## Task: fix-parsing

Fix a parsing issue with Nunjucks-containing HTML. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Reproduce

1. Add a failing test case to `src/index.spec.ts` using `nodeListToDebugMaps`
2. Run: `yarn test --scope @markuplint/nunjucks-parser`

### Step 2: Diagnose

1. Check if the issue is in ignoreTags patterns (`src/parser.ts`) or in the upstream `HtmlParser`
2. If the issue is upstream, fix it in `@markuplint/html-parser` instead

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/nunjucks-parser`
2. Test: `yarn test --scope @markuplint/nunjucks-parser`

## Task: add-test

Add a new test case. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Write the test

1. Read `src/index.spec.ts` for existing patterns
2. Use `nodeListToDebugMaps` for snapshot-style assertions
3. Use `parser.parse(source).nodeList` to get the node list

### Step 2: Verify

1. Test: `yarn test --scope @markuplint/nunjucks-parser`

## Rules

1. **Never override HtmlParser methods** in `NunjucksParser` -- this parser is ignoreTags-only.
2. **Order ignoreTags from most specific to least specific** when patterns share a common prefix.
3. **Add JSDoc comments** to all new public methods and properties.
4. **Test all three expression types** (block, output, comment) when modifying patterns.
