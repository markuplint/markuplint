---
description: Perform maintenance tasks for @markuplint/mustache-parser
globs:
  - packages/@markuplint/mustache-parser/src/**
alwaysApply: false
---

# mustache-parser-maintenance

Perform maintenance tasks for `@markuplint/mustache-parser`: modify ignoreTags configuration,
add new Mustache/Handlebars tag types, and update parser behavior.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task               | Description                                  |
| ------------------ | -------------------------------------------- |
| `modify-ignoretag` | Modify or add an ignoreTags entry            |
| `fix-parsing`      | Fix a parsing issue with Mustache/Handlebars |
| `update-tests`     | Add or update test cases                     |

If omitted, defaults to `modify-ignoretag`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ignoreTags configuration, and integration points
- `src/parser.ts` -- MustacheParser class (source of truth for ignoreTags)

## Task: modify-ignoretag

Modify or add an ignoreTags entry. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the current configuration

1. Read `src/parser.ts` and review the existing `ignoreTags` array
2. Understand the matching order: more specific patterns must come before less specific ones

### Step 2: Make the change

1. Add or modify the entry in the `ignoreTags` array in the `MustacheParser` constructor
2. Ensure correct ordering (e.g., `{{{` before `{{`, `{{!` before `{{`)
3. Each entry needs `type`, `start`, and `end` properties

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/mustache-parser`
2. Add test cases to `src/index.spec.ts` for the new tag type
3. Test: `yarn test --scope @markuplint/mustache-parser`

## Task: fix-parsing

Fix a parsing issue with Mustache/Handlebars templates. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Reproduce the issue

1. Create a minimal HTML template that demonstrates the parsing problem
2. Write a failing test case in `src/index.spec.ts`

### Step 2: Investigate

1. Read `src/parser.ts` to check if the issue is in the ignoreTags configuration
2. If the issue is in the base parser, check `@markuplint/html-parser` (HtmlParser)

### Step 3: Fix and verify

1. Apply the fix
2. Build: `yarn build --scope @markuplint/mustache-parser`
3. Test: `yarn test --scope @markuplint/mustache-parser`

## Task: update-tests

Add or update test cases. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the testing pattern

1. Read `src/index.spec.ts` to understand the existing test structure
2. Tests use `nodeListToDebugMaps` from `@markuplint/parser-utils` for assertions

### Step 2: Write the tests

1. Use `parser.parse()` to parse the template
2. Assert against `nodeListToDebugMaps(doc.nodeList)` for node structure
3. Assert against `doc.nodeList[n]?.nodeName` for individual node names

### Step 3: Verify

1. Test: `yarn test --scope @markuplint/mustache-parser`

## Rules

1. **Maintain ignoreTags ordering** -- more specific patterns (`{{{`, `{{!`) must appear before the general `{{` pattern.
2. **Keep the parser minimal** -- this package only configures `ignoreTags`; HTML parsing logic belongs in `@markuplint/html-parser`.
3. **Add JSDoc comments** to all new public exports.
4. **Test all tag types** when modifying the ignoreTags configuration.
