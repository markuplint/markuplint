---
description: Maintenance tasks for @markuplint/vue-parser
globs:
  - packages/@markuplint/vue-parser/src/**/*.ts
alwaysApply: false
---

# vue-parser-maintenance

Perform maintenance tasks for `@markuplint/vue-parser`: add Vue directives, modify element type
detection, update vue-eslint-parser version support, and fix comment injection.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                            | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `add-directive`                 | Add or modify a Vue directive in directivePatterns (vue-spec) |
| `modify-element-type-detection` | Update detectElementType() matchers                           |
| `update-vue-version-support`    | Handle vue-eslint-parser API changes                          |
| `fix-comment-injection`         | Fix template comment injection in flattenNodes()              |
| `update-component-scanner`      | Update component-scanner for pretenders auto scan             |

If omitted, defaults to `add-directive`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, directive processing, and element type detection
- `src/parser.ts` -- VueParser class (source of truth for all override methods)

## Task: add-directive

Add or modify a Vue directive in `directivePatterns` (`@markuplint/vue-spec`). Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the directive

1. Open `@markuplint/vue-spec` (`packages/@markuplint/vue-spec/src/index.ts`) and find the `directivePatterns` array
2. Identify where in the priority chain the new directive should be processed
3. Determine whether the directive needs `potentialName`, `isDirective`, or `isDynamicValue`

### Step 2: Add the directive pattern

1. Create a new regex block following the existing pattern (scoped block with destructuring)
2. Use `attr.name.raw.match()` to extract the directive prefix and value
3. Set the appropriate metadata:
   - `potentialName` — maps the directive to an equivalent HTML attribute name
   - `isDirective` — marks as a Vue-only directive with no HTML equivalent
   - `isDynamicValue` — indicates the attribute value is a JavaScript expression
4. Check if the attribute should be in `duplicatableAttrs` (e.g., class, style)

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-parser`
2. Add test cases to `src/index.spec.ts` covering:
   - The directive with its full form (e.g., `v-bind:prop`)
   - The shorthand form if applicable (e.g., `:prop`)
   - Edge cases with modifiers (e.g., `.stop`, `.lazy`)
3. Test: `yarn test --scope @markuplint/vue-parser`

## Task: modify-element-type-detection

Update `detectElementType()` matchers. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand current matchers

1. Read the `detectElementType()` method in `src/parser.ts`
2. Review the matcher array: string literals for built-in components, regex for PascalCase

### Step 2: Make the change

1. To add a new built-in component: add the component name as a string to the matcher array
2. To add a new pattern: add a regex to the matcher array
3. Components matching any entry return `'authored'` element type

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-parser`
2. Add test cases to the `elementType` test block in `src/index.spec.ts`
3. Test: `yarn test --scope @markuplint/vue-parser`

## Task: update-vue-version-support

Handle vue-eslint-parser API changes. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the change

1. Read `src/vue-parser/index.ts` — the wrapper around vue-eslint-parser
2. Check the vue-eslint-parser changelog for breaking changes
3. Verify the `ASTNode` and `ASTComment` type exports still match

### Step 2: Make the change

1. Update `vueParse()` if the `parse()` API signature changed
2. Update type exports (`ASTNode`, `ASTComment`, `VueTokens`) if AST types changed
3. Update `tokenize()` in `src/parser.ts` if `templateBody` structure changed

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-parser`
2. Test: `yarn test --scope @markuplint/vue-parser`
3. Test with real Vue SFC files to ensure correct parsing

## Task: fix-comment-injection

Fix template comment injection in `flattenNodes()`. Follow recipe #4 in `docs/maintenance.md`.

### Step 1: Understand the issue

1. Read the `flattenNodes()` method in `src/parser.ts`
2. Understand the two-pass approach: first flatten, then inject comments
3. Check how `this.state.comments` is populated in `tokenize()`

### Step 2: Fix the injection logic

1. Verify the comment range check: `lastOffset <= comment.range[0] && comment.range[1] <= node.startOffset`
2. Verify `this.visitComment()` is called with the correct `isBogus` flag
3. Verify `this.appendChild()` correctly attaches the comment to the parent

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/vue-parser`
2. Test with Vue templates containing HTML comments (`<!-- -->`), bogus comments (`<!...>`), and mixed content
3. Test: `yarn test --scope @markuplint/vue-parser`

## Task: update-component-scanner

Update `src/component-scanner.ts` when Vue slot syntax or script block handling changes.

### When to update

- New slot-like syntax is added to Vue (e.g., a new built-in component that acts as a slot)
- `<script setup>` extraction logic needs to change (e.g., new script attributes)
- The `extractComponentInfo` shared logic needs a fix (also update svelte-parser and astro-parser)

### Step 1: Make the change

1. Read `src/component-scanner.ts`
2. Modify `detectSlots()` for new slot patterns, or `extractVueScriptSetup()` for script changes
3. If modifying `extractComponentInfo()`, apply the same change to all three parsers (vue, svelte, astro)

### Step 2: Verify

1. Update tests in `src/component-scanner.spec.ts`
2. Build: `yarn build --scope @markuplint/vue-parser`
3. Test: `npx vitest run packages/@markuplint/vue-parser/src/component-scanner.spec.ts`
4. Run pretenders integration tests: `npx vitest run packages/@markuplint/pretenders`

## Rules

1. **Use vue-eslint-parser** for all template parsing — never parse Vue templates manually.
2. **Use `potentialName`** for directives that map to HTML attributes (e.g., `@click` -> `onclick`).
3. **Use `isDirective: true`** for directives with no HTML equivalent (e.g., `v-if`, `v-for`).
4. **Test with `nodeListToDebugMaps`** — this is the standard assertion pattern for parser tests.
5. **Add JSDoc comments** to all new public methods and properties.
6. **Preserve directive priority order** in `directivePatterns` — `.prop` shorthand before `v-bind` with modifiers before `v-bind`/`:` before `v-on`/`@` before `v-model` before `v-slot`/`#` before generic `v-`.
