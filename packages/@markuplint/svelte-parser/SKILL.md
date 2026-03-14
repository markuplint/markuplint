---
description: Maintenance tasks for @markuplint/svelte-parser
globs:
  - packages/@markuplint/svelte-parser/src/**/*.ts
alwaysApply: false
---

# svelte-parser-maintenance

Perform maintenance tasks for `@markuplint/svelte-parser`: add directives, add control flow blocks,
update SvelteKit placeholders, and modify attribute processing.

## Input

`$ARGUMENTS` specifies the task. Supported tasks:

| Task                            | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `add-directive`                 | Add a new Svelte directive to directivePatterns (svelte-spec) |
| `add-control-flow-block`        | Add a new control flow block to nodeize()                     |
| `update-sveltekit-placeholders` | Update SvelteKit template placeholder patterns                |
| `update-component-scanner`      | Update component-scanner for pretenders auto scan             |

If omitted, defaults to `add-directive`.

## Reference

Before executing any task, read `docs/maintenance.md` (or `docs/maintenance.ja.md`)
for the full guide. The recipes there are the source of truth for procedures.

Also read:

- `ARCHITECTURE.md` -- Package overview, control flow blocks, attribute processing details
- `src/parser.ts` -- SvelteParser class (source of truth for all override methods)

## Task: add-directive

Add a new Svelte directive to `directivePatterns` (`@markuplint/svelte-spec`). Follow recipe #1 in `docs/maintenance.md`.

### Step 1: Understand the current directive handling

1. Open `@markuplint/svelte-spec` (`packages/@markuplint/svelte-spec/src/index.ts`) and find the `directivePatterns` array
2. Review the directive table in `ARCHITECTURE.md` to understand existing patterns
3. Identify whether the new directive should be `isDirective=true`, or requires special processing like `bind:`

### Step 2: Add the directive

1. Add a new pattern entry in the `directivePatterns` array in `@markuplint/svelte-spec`
2. Set the appropriate flags: `isDirective`, `isDynamicValue`, `potentialName`, `isDuplicatable`
3. For directives that need special attribute processing (e.g., spread, shorthand), also update `visitAttr()` in `src/parser.ts`

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/svelte-parser`
2. Add test cases to `src/index.spec.ts` with the new directive syntax
3. Test: `yarn test --scope @markuplint/svelte-parser`

## Task: add-control-flow-block

Add a new control flow block to `nodeize()`. Follow recipe #2 in `docs/maintenance.md`.

### Step 1: Understand the block structure

1. Read `src/parser.ts` and examine existing block cases in `nodeize()` (IfBlock, EachBlock, AwaitBlock, KeyBlock, SnippetBlock)
2. Read `src/parse-block.ts` to understand the `parseBlock()` utility
3. Determine the new block's structure: how many psblock nodes it produces, whether it has intermediate tags

### Step 2: Add the block case

1. Add a new `case 'NewBlock':` in the `switch (originNode.type)` block in `nodeize()`
2. For simple blocks (open/close only), use `parseBlock()` like KeyBlock
3. For complex blocks (with intermediate tags), implement a private `#parseNewBlock()` method like `#parseEachBlock()` or `#parseAwaitBlock()`
4. Update the `SvelteBlock` type union in `src/svelte-parser/index.ts` if needed

### Step 3: Update parseBlock() if needed

1. If the new block type has a different fragment field, add a case in the `fragment` selection logic in `parse-block.ts`
2. The regex `{\s*\/[a-z]+\s*}$` must match the new block's closing tag

### Step 4: Verify

1. Build: `yarn build --scope @markuplint/svelte-parser`
2. Add test cases with `nodeListToDebugMaps` assertions
3. Test: `yarn test --scope @markuplint/svelte-parser`

## Task: update-sveltekit-placeholders

Update SvelteKit template placeholder patterns. Follow recipe #3 in `docs/maintenance.md`.

### Step 1: Understand the current configuration

1. Read `src/sveltekit-parser.ts`
2. The `ignoreTags` array defines patterns that match SvelteKit placeholders

### Step 2: Add or modify placeholders

1. To add a new placeholder: add an entry to the `ignoreTags` array
2. The `start` field should match the beginning of the placeholder (e.g., `%sveltekit.`)
3. The `end` field should match the end of the placeholder (e.g., `%`)
4. The `type` field is used as the psblock node name

### Step 3: Verify

1. Build: `yarn build --scope @markuplint/svelte-parser`
2. Add test cases to `src/sveltekit-parser.spec.ts`
3. Test: `yarn test --scope @markuplint/svelte-parser`

## Task: update-component-scanner

Update `src/component-scanner.ts` when Svelte slot syntax or script block handling changes.

### When to update

- New slot-like syntax is added (e.g., Svelte 5 added `{@render children()}` alongside `<slot>`)
- `<script>` vs `<script context="module">` priority logic needs to change
- The `extractComponentInfo` shared logic needs a fix (also update vue-parser and astro-parser)

### Step 1: Make the change

1. Read `src/component-scanner.ts`
2. Modify `detectSlots()` for new slot patterns (check psblock node names from the Svelte parser)
3. If modifying `extractComponentInfo()`, apply the same change to all three parsers (vue, svelte, astro)

### Step 2: Verify

1. Update tests in `src/component-scanner.spec.ts`
2. Build: `yarn build --scope @markuplint/svelte-parser`
3. Test: `npx vitest run packages/@markuplint/svelte-parser/src/component-scanner.spec.ts`
4. Run pretenders integration tests: `npx vitest run packages/@markuplint/pretenders`

## Rules

1. **Use `svelte/compiler` for tokenization** — never parse Svelte templates manually. Always delegate to `svelteParse()`.
2. **Use `parseBlock()` for control flow blocks** — the shared utility in `parse-block.ts` handles closing tag detection via regex `{\s*\/[a-z]+\s*}$`.
3. **Test with `nodeListToDebugMaps`** — all parser tests should use this utility for snapshot-style assertions.
4. **Preserve `visitPsBlock()` single-node invariant** — the override enforces exactly one psblock node per call. Do not return multiple nodes.
5. **Keep `<script>` handling in `visitText()`** — do not move `<script>` to `ignoreTags`. The `lang` attribute must be preserved.
6. **Add JSDoc comments** to all new public methods and properties.
