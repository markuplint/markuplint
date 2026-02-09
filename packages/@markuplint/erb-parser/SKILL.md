---
description: Perform maintenance tasks for @markuplint/erb-parser
globs:
  - packages/@markuplint/erb-parser/src/**
alwaysApply: false
---

# erb-parser-maintenance

Perform maintenance tasks for `@markuplint/erb-parser`: add or modify ERB ignoreTags patterns.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                | Description                             |
| ------------------- | --------------------------------------- |
| `add-ignore-tag`    | Add a new ERB tag pattern to ignoreTags |
| `modify-ignore-tag` | Modify an existing ignoreTags pattern   |

If omitted, defaults to `add-ignore-tag`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, ignoreTags configuration, and integration points
- `src/parser.ts` -- ERubyParser class (source of truth for ignoreTags configuration)

## Task: add-ignore-tag

Add a new ERB tag pattern to the ignoreTags array. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Determine the pattern

1. Read `src/parser.ts` to see existing ignoreTags entries
2. Define the new tag's `type`, `start`, and `end` patterns
3. Determine the correct position in the array (more specific patterns first)

### Step 2: Add the entry

1. Add the new entry to the `ignoreTags` array in the `ERubyParser` constructor
2. Use a string for literal start patterns, or a regex for patterns requiring lookahead/lookbehind

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/erb-parser`
2. Add test cases to `src/index.spec.ts` verifying the new tag type appears as `#ps:<type>` in the AST
3. Test: `yarn test --scope @markuplint/erb-parser`

## Task: modify-ignore-tag

Modify an existing ignoreTags pattern. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Identify the pattern

1. Read `src/parser.ts` and locate the ignoreTags entry to modify
2. Understand why the change is needed (e.g., new ERB syntax, false matches)

### Step 2: Make the change

1. Update the `start`, `end`, or `type` fields as needed
2. Ensure pattern ordering is still correct (more specific patterns first)
3. If changing a regex pattern, verify it does not match escaped ERB delimiters (`<%%`)

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/erb-parser`
2. Update test cases in `src/index.spec.ts` if the AST node names changed
3. Test: `yarn test --scope @markuplint/erb-parser`

## Rules

1. **Pattern order matters** -- More specific patterns (e.g., `<%=`, `<%#`) must appear before general patterns (e.g., `/<%(?!%)/`).
2. **Escaped delimiters** -- `<%%` must not be matched by any pattern. Use negative lookahead `(?!%)` on general patterns.
3. **Add JSDoc comments** to document any new tag types.
4. **No downstream impact** -- This is a leaf parser with no downstream dependencies.
