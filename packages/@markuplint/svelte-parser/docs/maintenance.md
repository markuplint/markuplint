# Maintenance Guide

## Commands

| Command                                        | Description            |
| ---------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/svelte-parser` | Build this package     |
| `yarn dev --scope @markuplint/svelte-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/svelte-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/svelte-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File                     | Coverage                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| `index.spec.ts`               | SvelteParser integration tests (elements, control flow, directives) |
| `svelte-parser/index.spec.ts` | svelte/compiler integration tests (AST structure validation)        |
| `sveltekit-parser.spec.ts`    | SvelteKit template parser tests (placeholder tag handling)          |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/svelte-parser';

const doc = parser.parse('<div class="foo">{name}</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

## Recipes

### 1. Adding a New Directive

1. Open `@markuplint/svelte-spec` (`packages/@markuplint/svelte-spec/src/index.ts`) and find the `directivePatterns` array
2. Identify the directive prefix (e.g., `newdir:`) and determine the required flags:
   - `isDirective: true` for pure directives (like `on:`, `use:`, `transition:`)
   - `isDirective: undefined` + `potentialName` for directives that map to attributes (like `bind:value`)
   - `isDuplicatable: true` if multiple instances are allowed (like `class:`)
3. Add a new `if (baseName === 'newdir')` branch after the existing directive checks
4. Build: `yarn build --scope @markuplint/svelte-parser`
5. Add test cases to `src/index.spec.ts`
6. Test: `yarn test --scope @markuplint/svelte-parser`

### 2. Adding a New Control Flow Block

1. Read `src/parser.ts` and examine existing block cases in `nodeize()`
2. Determine the block structure:
   - **Simple block** (open + close only, like `{#key}...{/key}`) → use `parseBlock()` from `parse-block.ts`
   - **Complex block** (with intermediate tags, like `{#each}...{:else}...{/each}`) → implement a private method
3. Add a new `case 'NewBlock':` in the `switch (originNode.type)` block in `nodeize()`
4. For simple blocks, follow the `KeyBlock` pattern:
   ```ts
   case 'NewBlock': {
       const { openToken, closeToken } = parseBlock(this, { ...token, depth, parentNode }, originNode);
       return [
           this.visitPsBlock({ ...openToken, depth, parentNode, nodeName: 'new', isFragment: true }, originNode.fragment.nodes)[0],
           this.visitPsBlock({ ...closeToken, depth, parentNode, nodeName: '/new', isFragment: true })[0],
       ];
   }
   ```
5. For complex blocks, follow the `#parseEachBlock()` or `#parseAwaitBlock()` pattern
6. Update the `SvelteBlock` union type in `src/svelte-parser/index.ts` if the Svelte compiler adds a new AST type
7. Update `parseBlock()` in `src/parse-block.ts` if the new block has a different fragment field name
8. Build and test: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

### 3. Updating SvelteKit Placeholders

> **Architectural note:** `SvelteKitTemplateParser` extends `HtmlParser` (template engine pattern), **not** `Parser` like `SvelteParser`. It is an entirely separate implementation that handles SvelteKit's `app.html` via the `ignoreTags` mechanism. The parser is exported via the `./kit` subpath (`@markuplint/svelte-parser/kit`). See `ARCHITECTURE.md` § SvelteKit Parser for the full architectural distinction.

1. Read `src/sveltekit-parser.ts`
2. Add or modify entries in the `ignoreTags` array:
   ```ts
   ignoreTags: [
       {
           type: 'sveltekit-placeholder',
           start: '%sveltekit.',
           end: '%',
       },
       // add new placeholder patterns here
   ],
   ```
3. The current single pattern matches all `%sveltekit.*%` placeholders:
   - `%sveltekit.head%` — `<head>` content
   - `%sveltekit.body%` — Rendered page body
   - `%sveltekit.assets%` — Assets base path
   - `%sveltekit.nonce%` — CSP nonce
   - `%sveltekit.env.[NAME]%` — Environment variables
4. Build: `yarn build --scope @markuplint/svelte-parser`
5. Add test cases to `src/sveltekit-parser.spec.ts` (this is a separate test file from `src/index.spec.ts`)
6. Test: `yarn test --scope @markuplint/svelte-parser`

### 4. Modifying the specificBindDirective Set

1. Read `src/parser.ts` and locate the `specificBindDirective` property
2. The set determines which `bind:` sub-names are treated as true directives (currently `group` and `this`)
3. To add a new entry, modify the constructor:
   ```ts
   readonly specificBindDirective: ReadonlySet<string> = new Set(['group', 'this', 'newname']);
   ```
4. Build and test: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

### 5. Updating svelte/compiler Integration

1. Read `src/svelte-parser/index.ts`
2. The `svelteParse()` function wraps `svelte/compiler`'s `parse()` with `{ modern: true }`
3. When updating the Svelte dependency:
   - Check for new AST node types in the Svelte compiler
   - Update the `SvelteNode` type union if needed
   - Update the `SvelteBlock` type union if new block types are added
   - Add new cases in `nodeize()` for any new node types
4. Build and test: `yarn build --scope @markuplint/svelte-parser && yarn test --scope @markuplint/svelte-parser`

## Troubleshooting

### Control flow block produces wrong number of psblock nodes

**Symptom:** A control flow block (e.g., `{#if}...{:else}...{/if}`) produces more or fewer psblock nodes than expected.

**Cause:** The token boundary calculation is incorrect, or intermediate tags are not being detected properly.

**Solution:**

1. Check the regex patterns used for token detection:
   - `#traverseIfBlock()` — check the `alternate` field traversal
   - `#parseEachBlock()` — check the `{\s*:else\s*}$` regex
   - `#parseAwaitBlock()` — check the `{\s*:then[\s|}]` and `{\s*:catch[\s|}]` regexes
   - `parseBlock()` — check the `{\s*\/[a-z]+\s*}$` regex
2. Verify the Svelte AST node structure by logging `originBlockNode` — field names may change between Svelte versions

### Attribute directive not recognized

**Symptom:** A Svelte directive (e.g., `bind:value`) is not parsed with the correct `isDirective` / `potentialName` flags.

**Cause:** The directive prefix is not handled in `directivePatterns` (defined in `@markuplint/svelte-spec`), or a specific bind directive pattern is missing.

**Solution:**

1. Check the `directivePatterns` array in `@markuplint/svelte-spec` — ensure the directive prefix pattern is present
2. Check `specificBindDirective` — entries in this set are treated as true directives; entries not in this set get `potentialName` behavior
3. Add a test case with the specific directive syntax

### SvelteKit placeholder not masked

**Symptom:** A SvelteKit placeholder like `%sveltekit.head%` appears as raw text instead of a psblock.

**Cause:** The `ignoreTags` pattern in `SvelteKitTemplateParser` does not match the placeholder syntax.

**Solution:**

1. Check `src/sveltekit-parser.ts` — verify the `start` and `end` patterns match the placeholder
2. The `start` field matches the beginning of the placeholder (e.g., `%sveltekit.`)
3. The `end` field matches the end of the placeholder (e.g., `%`)

### Script tag not converted to psblock

**Symptom:** `<script>` tags inside Svelte templates appear as text nodes instead of Script psblock nodes.

**Cause:** The `visitText()` override is not detecting the `<script>` pattern.

**Solution:**

1. Check `visitText()` in `src/parser.ts` — the regex `/^<script[\s>]/i` must match the script tag
2. Do NOT move `<script>` handling to `ignoreTags` — the `lang` attribute needs to be preserved (see issue #2505)

### Svelte compiler error not wrapped properly

**Symptom:** Svelte syntax errors produce unhelpful error messages without source location.

**Cause:** The `parseError()` method is not matching the Svelte compiler error shape.

**Solution:**

1. Check `parseError()` in `src/parser.ts` — it expects errors with `start`, `end`, and `frame` properties
2. If the Svelte compiler error shape changes, update the property checks accordingly
