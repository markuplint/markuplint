---
description: Perform maintenance tasks for @markuplint/smarty-parser
globs:
  - packages/@markuplint/smarty-parser/src/**
alwaysApply: false
---

# smarty-parser-maintenance

Perform maintenance tasks for `@markuplint/smarty-parser`: modify ignoreTags configuration,
add new Smarty tag patterns, and update tests.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task               | Description                              |
| ------------------ | ---------------------------------------- |
| `modify-ignoretag` | Add or modify an ignoreTags pattern      |
| `fix-parsing`      | Fix a parsing issue with Smarty syntax   |
| `add-test`         | Add test cases for specific Smarty usage |

If omitted, defaults to `modify-ignoretag`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview and ignoreTags configuration
- `src/parser.ts` -- SmartyParser class (source of truth for ignore patterns)

## Task: modify-ignoretag

Add or modify an ignoreTags pattern. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the current configuration

1. Read `src/parser.ts` and review the existing `ignoreTags` array
2. Understand the ordering: most specific patterns must come first

### Step 2: Make the change

1. Add the new pattern or modify an existing one in the `ignoreTags` array
2. Use a descriptive `type` name prefixed with `smarty-`
3. Ensure proper ordering: longer/more specific start delimiters before shorter ones

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/smarty-parser`
2. Add test cases to `src/index.spec.ts` verifying the new pattern produces the correct `#ps:smarty-*` node
3. Test: `yarn test --scope @markuplint/smarty-parser`

## Task: fix-parsing

Fix a parsing issue with Smarty syntax. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Reproduce the issue

1. Create a minimal Smarty template that demonstrates the problem
2. Write a failing test case in `src/index.spec.ts`

### Step 2: Identify the cause

1. Check if the issue is in the ignoreTags ordering (most common cause)
2. Check if the delimiter pattern is too greedy or too restrictive
3. If the issue is in the base parser, the fix belongs in `@markuplint/html-parser` or `@markuplint/parser-utils`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/smarty-parser`
2. Test: `yarn test --scope @markuplint/smarty-parser`

## Task: add-test

Add test cases for specific Smarty usage. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Write the test

1. Read `src/index.spec.ts` for the existing test patterns
2. Use `nodeListToDebugMaps()` for snapshot-style assertions
3. Test node names: `#ps:smarty-scriptlet`, `#ps:smarty-comment`, `#ps:smarty-literal`

### Step 2: Verify

1. Test: `yarn test --scope @markuplint/smarty-parser`

## Rules

1. **Never reorder ignoreTags carelessly** -- more specific patterns must come before less specific ones.
2. **Always prefix type names with `smarty-`** for consistency.
3. **Test with real Smarty patterns** -- `{if}`, `{foreach}`, `{include}`, `{$variable}`, `{$var|modifier}`.
4. **Add JSDoc comments** to all new public methods and properties.
