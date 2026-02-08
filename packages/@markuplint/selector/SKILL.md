---
description: Perform maintenance tasks for @markuplint/selector
---

# selector-maintenance

Perform maintenance tasks for `@markuplint/selector`: add extended pseudo-classes,
support new CSS selectors, debug matching issues, and update dependencies.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                               | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `add-pseudo-class <name>`          | Add a new extended pseudo-class              |
| `add-selector-support <type>`      | Add support for a new CSS selector type      |
| `debug-matching <selector> <html>` | Debug selector matching against HTML         |
| `update-deps`                      | Update dependencies and verify compatibility |

If omitted, defaults to `add-pseudo-class`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `docs/matching.md` -- Selector matching algorithm details
- `ARCHITECTURE.md` -- Package overview, module map, and class hierarchy

## Task: add-pseudo-class

Add a new markuplint-specific extended pseudo-class. Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Create the handler

1. Read existing handlers in `src/extended-selector/` to understand the pattern
2. Create `src/extended-selector/<name>-pseudo-class.ts`
3. Implement the handler following the `ExtendedPseudoClass` signature:
   ```typescript
   (content: string) => (el: Element) => SelectorResult;
   ```
4. Return specificity `[0, 1, 0]` for consistency with other extended pseudo-classes

### Step 2: Register the handler

1. Open `src/create-selector.ts`
2. Import the new handler
3. Add it to the extended object in `createSelector()` when `specs` is provided

### Step 3: Test and document

1. Add tests in `src/create-selector.spec.ts` or a new test file
2. Update `README.md` extended selector table
3. Build: `yarn build --scope @markuplint/selector`
4. Run tests: `yarn test --scope @markuplint/selector`

## Task: add-selector-support

Add support for a currently unsupported CSS pseudo-class. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Implement matching

1. Read `src/selector.ts`, find the `pseudoMatch()` function
2. Move the target pseudo-class from the unsupported case list
3. Add a new case with matching implementation
4. Ensure correct specificity assignment

### Step 2: Test and document

1. Add tests covering the new selector
2. Update `README.md` support table (change `❌` to `✅`)
3. Build: `yarn build --scope @markuplint/selector`
4. Run tests: `yarn test --scope @markuplint/selector`

## Task: debug-matching

Debug why a selector matches or doesn't match against given HTML.

### Step 1: Set up the environment

1. Read `src/selector.ts` and `src/match-selector.ts` to understand the matching flow
2. Identify whether the selector is a CSS string or a `RegexSelector` object

### Step 2: Trace the matching

1. Enable debug logging: `DEBUG=selector* yarn test --scope @markuplint/selector`
2. For CSS selectors, trace through:
   - `Ruleset.parse()` -- Check that the selector parses correctly
   - `StructuredSelector` -- Check the `SelectorTarget` chain
   - `SelectorTarget` -- Check each compound selector component
3. For regex selectors, trace through:
   - `regexSelectorMatches()` -- Check pattern matching results
   - `SelectorTarget.match()` -- Check combinator traversal

### Step 3: Report findings

1. Identify the exact point where matching succeeds or fails
2. Check if the issue is in parsing, matching, or specificity calculation
3. Suggest a fix or workaround

## Task: update-deps

Update package dependencies and verify compatibility.

1. Read `package.json` for current dependency versions
2. Check for available updates
3. For `postcss-selector-parser` updates:
   - Review the changelog for breaking AST or API changes
   - Refer to recipe #3 in `docs/maintenance.md` for the integration surface
4. For `@markuplint/ml-spec` updates:
   - Check for type changes affecting extended pseudo-classes
5. Update dependencies
6. Build: `yarn build --scope @markuplint/selector`
7. Run tests: `yarn test --scope @markuplint/selector`
8. Verify no regressions in selector matching

## Rules

1. **Always build after source changes.** Run `yarn build --scope @markuplint/selector` before testing.
2. **All extended pseudo-classes use `[0, 1, 0]` specificity.** Maintain this consistency.
3. **CSS matching uses postcss-selector-parser AST.** Never manually parse CSS selector strings.
4. **Regex matching is separate from CSS matching.** They share the `matchSelector()` entry point but use different code paths.
5. **Selector instances are cached.** After changing parsing or matching logic, the cache may return stale instances in tests. Clear the cache or restart the test runner.
