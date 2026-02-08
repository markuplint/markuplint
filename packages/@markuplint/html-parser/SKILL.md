---
description: Perform maintenance tasks for @markuplint/html-parser
---

# html-parser-maintenance

Perform maintenance tasks for `@markuplint/html-parser`: modify HtmlParser override methods,
add namespaces, fix ghost element handling, and update head/body optimization.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                  | Description                           |
| --------------------- | ------------------------------------- |
| `modify-override`     | Modify an HtmlParser override method  |
| `add-namespace`       | Add a new namespace to getNamespace() |
| `fix-ghost-element`   | Fix ghost element position handling   |
| `update-optimization` | Update head/body tag optimization     |

If omitted, defaults to `modify-override`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, parse5 integration, and ghost element handling
- `src/parser.ts` -- HtmlParser class (source of truth for override methods)

## Task: modify-override

Modify an HtmlParser override method. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the method

1. Read `src/parser.ts` and identify the override method to change
2. Read the base `Parser` class in `@markuplint/parser-utils` to understand the parent behavior

### Step 2: Make the change

1. Preserve `super.*()` calls where required:
   - `beforeParse()` — must call `super.beforeParse()` first
   - `afterParse()` — must call `super.afterParse()` first
   - `afterNodeize()` — must call `super.afterNodeize()` first
2. Maintain state updates if the method interacts with `this.state`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/html-parser`
2. Test: `yarn test --scope @markuplint/html-parser`
3. Run downstream tests (jsx-parser, vue-parser, svelte-parser, astro-parser)

## Task: add-namespace

Add a new namespace to `getNamespace()`. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Add the namespace case

1. Read `src/get-namespace.ts`
2. Add a new `case` in the `switch (parentNamespace)` block
3. Choose an appropriate wrapper element for the new namespace

### Step 2: Verify

1. Build: `yarn build --scope @markuplint/html-parser`
2. Add test cases to `src/get-namespace.spec.ts`
3. Test: `yarn test --scope @markuplint/html-parser`

## Task: fix-ghost-element

Fix ghost element position handling. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand the issue

1. Read the `nodeize()` method in `src/parser.ts` — the `if (!location)` block
2. Read `afterNodeize()` to understand `afterPosition` state tracking

### Step 2: Fix the position calculation

1. Check the depth comparison: `this.state.afterPosition.depth === depth`
2. Check the fallback to `parentNode` end position
3. Verify `afterNodeize()` correctly updates `this.state.afterPosition`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/html-parser`
2. Test with HTML that triggers ghost elements
3. Test: `yarn test --scope @markuplint/html-parser`

## Task: update-optimization

Update head/body tag optimization. Follow recipe #4 in `docs/maintenance.md`.

### Step 1: Understand the current optimization

1. Read `src/optimize-starts-head-or-body.ts`
2. Understand the three functions: detection, setup, and resume

### Step 2: Make the change

1. The placeholder character `\uFFFD` must remain unique
2. The `replaceAll` regex must match both opening and closing tags
3. Restoration must handle both `starttag` and `endtag` node types

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/html-parser`
2. Test: `yarn test --scope @markuplint/html-parser`
3. Add or update test cases in `src/optimize-starts-head-or-body.spec.ts`

## Rules

1. **Always call `super.beforeParse()`, `super.afterParse()`, `super.afterNodeize()`** when overriding these methods.
2. **Never call `super.tokenize()` or `super.nodeize()`** — the parent defaults return empty arrays.
3. **Maintain `afterPosition` state** — ghost element positioning depends on it.
4. **Test across all downstream parsers** when modifying `HtmlParser` (jsx-parser, vue-parser, svelte-parser, astro-parser).
5. **Add JSDoc comments** to all new public methods and properties.
