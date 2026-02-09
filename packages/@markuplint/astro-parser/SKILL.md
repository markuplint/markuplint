---
description: Maintenance tasks for @markuplint/astro-parser
globs:
  - packages/@markuplint/astro-parser/src/**/*.ts
alwaysApply: false
---

# astro-parser-maintenance

Perform maintenance tasks for `@markuplint/astro-parser`: add template directives,
modify namespace scoping, update expression handling, and manage astro-eslint-parser integration.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                         | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `add-directive`              | Add a new Astro template directive                  |
| `modify-namespace-scoping`   | Modify SVG/XHTML namespace scoping logic            |
| `update-expression-handling` | Update expression splitting or MustacheTag handling |

If omitted, defaults to `add-directive`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, attribute processing, namespace scoping
- `src/parser.ts` -- AstroParser class (source of truth for override methods)
- `src/astro-parser.ts` -- astro-eslint-parser wrapper

## Task: add-directive

Add a new Astro template directive. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the directive pattern

1. Read `src/parser.ts` — the `visitAttr()` method
2. Identify the regex: `/^([^:]+):([^:]+)$/`
3. Understand the `switch (lowerCaseDirectiveName)` block

### Step 2: Add the directive case

1. Add a new `case` in the switch for the directive prefix
2. Decide whether it maps to a `potentialName` (like `class:list` → `class`) or is a pure directive (`isDirective: true`)
3. If it maps to a standard HTML attribute, set `potentialName` to the attribute name
4. If it is Astro-specific, set `isDirective = true`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/astro-parser`
2. Add test cases to `src/parser.spec.ts` using `nodeListToDebugMaps`
3. Test: `yarn test --scope @markuplint/astro-parser`

## Task: modify-namespace-scoping

Modify the SVG/XHTML namespace scoping logic. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand the current logic

1. Read `src/parser.ts` — the `#updateScopeNS()` private method
2. Understand the two conditions: `<svg>` → SVG namespace, `<foreignObject>` parent → XHTML namespace
3. Note that `scopeNS` is applied in `visitElement()` via `overwriteProps`

### Step 2: Make the change

1. Add or modify conditions in `#updateScopeNS()`
2. For new namespaces (e.g., MathML), add a new condition checking `originNode.name`
3. Ensure the namespace URI constant is correct

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/astro-parser`
2. Add namespace test cases to `src/parser.spec.ts`
3. Test: `yarn test --scope @markuplint/astro-parser`

## Task: update-expression-handling

Update expression splitting or MustacheTag handling. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the current logic

1. Read `src/parser.ts` — the `case 'expression'` block in `nodeize()`
2. Understand the splitting logic: `firstChild !== lastChild` check
3. Understand how opening and closing fragments are created

### Step 2: Make the change

1. Modify the splitting logic in the `expression` case
2. Ensure `startExpressionRaw` and `startExpressionStartLine`/`startExpressionStartCol` are correctly set
3. Ensure the closing fragment location is correctly calculated from `lastChild`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/astro-parser`
2. Test with expressions containing nested HTML (e.g., `{list.map(item => <li>{item}</li>)}`)
3. Test: `yarn test --scope @markuplint/astro-parser`

## Rules

1. **Delegate tokenization to astro-eslint-parser** — never parse Astro syntax manually; always use `astroParse()`.
2. **Use `potentialName` for attribute mapping** — when a directive maps to a standard HTML attribute, set `potentialName` instead of modifying the attribute name.
3. **Test with `nodeListToDebugMaps`** — all parser tests should use `nodeListToDebugMaps` for snapshot-style assertions that verify positions, names, and types.
4. **Maintain `scopeNS` state** — namespace scoping must be updated before node type dispatch in `nodeize()`.
5. **Add JSDoc comments** to all new public methods and properties.
