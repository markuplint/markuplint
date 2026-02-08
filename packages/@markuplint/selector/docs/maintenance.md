# Maintenance Guide

Practical operations and maintenance guide for `@markuplint/selector`.

## Commands

| Command                                         | Description                  |
| ----------------------------------------------- | ---------------------------- |
| `yarn build --scope @markuplint/selector`       | Compile TypeScript to `lib/` |
| `yarn workspace @markuplint/selector run dev`   | Watch mode compilation       |
| `yarn workspace @markuplint/selector run clean` | Clean compiled output        |
| `yarn test --scope @markuplint/selector`        | Run tests                    |

## Testing

Tests use `vitest` with `jsdom` as the DOM environment. Four test files cover the package:

| Test File                        | Coverage                                                                  |
| -------------------------------- | ------------------------------------------------------------------------- |
| `selector.spec.ts`               | Core `Selector` class, CSS selector matching, combinators, pseudo-classes |
| `create-selector.spec.ts`        | `createSelector()` factory, caching, extended pseudo-class integration    |
| `match-selector.spec.ts`         | `matchSelector()` unified function, CSS and regex selector dispatch       |
| `regex-selector-matches.spec.ts` | `regexSelectorMatches()` pattern matching, capture groups                 |

### Running Tests

```bash
# Run all selector tests
yarn test --scope @markuplint/selector

# Run a specific test file
yarn workspace @markuplint/selector run vitest run src/selector.spec.ts
```

## Common Recipes

### 1. Adding a New Extended Pseudo-Class

To add a new markuplint-specific pseudo-class (e.g., `:custom()`):

1. Create `src/extended-selector/custom-pseudo-class.ts`:

   ```typescript
   import type { SelectorResult } from '../types.js';

   export function customPseudoClass() {
     return (content: string) =>
       (el: Element): SelectorResult => {
         // Parse content string and match against el
         const matched = /* your matching logic */;
         return {
           specificity: [0, 1, 0],
           matched,
           ...(matched ? { nodes: [el], has: [] } : {}),
         };
       };
   }
   ```

2. Register it in `src/create-selector.ts`:

   ```typescript
   import { customPseudoClass } from './extended-selector/custom-pseudo-class.js';

   // In createSelector(), add to the extended object:
   instance = new Selector(
     selector,
     specs
       ? {
           model: contentModelPseudoClass(specs),
           aria: ariaPseudoClass(),
           role: ariaRolePseudoClass(specs),
           custom: customPseudoClass(), // Add here
         }
       : undefined,
   );
   ```

3. Add tests in `src/create-selector.spec.ts` or a new test file
4. Update `README.md` with the new pseudo-class documentation
5. Build: `yarn build --scope @markuplint/selector`

### 2. Adding Support for a New CSS Selector Type

To support a currently unsupported pseudo-class (e.g., `:empty`):

1. Open `src/selector.ts`
2. Find the `pseudoMatch()` function's switch statement
3. Move the pseudo-class from the "unsupported" case list to a new case with implementation:
   ```typescript
   case ':empty': {
     const hasChildren = el.childNodes.length === 0;
     return {
       specificity: [0, 1, 0],
       matched: hasChildren,
       ...(hasChildren ? { nodes: [el], has: [] } : {}),
     };
   }
   ```
4. Add tests for the new selector
5. Update `README.md` support table (change `❌` to `✅`)
6. Build: `yarn build --scope @markuplint/selector`

### 3. Handling postcss-selector-parser Major Updates

When `postcss-selector-parser` releases a major version:

1. Check the changelog for breaking changes in:
   - AST node types (`parser.Selector`, `parser.Node`, etc.)
   - Parser API (`parser()`, `.processSync()`)
   - Node property names and types
2. Key integration points in `src/selector.ts`:
   - `Ruleset.parse()` -- Uses `parser()` and `processSync()`
   - `StructuredSelector` constructor -- Walks `parser.Node` types
   - `SelectorTarget` -- Accesses node properties (`value`, `attribute`, `operator`, `raws`, etc.)
3. Update the dependency version in `package.json`
4. Fix any type errors or API changes
5. Run the full test suite to verify compatibility
6. Build: `yarn build --scope @markuplint/selector`

### 4. Fixing Specificity Calculation

If specificity is calculated incorrectly:

1. Check `src/compare-specificity.ts` for comparison logic
2. Check `src/selector.ts` for specificity assignment in `SelectorTarget` and `pseudoMatch()`
3. For regex selectors, check `src/match-selector.ts` `uncombinedRegexSelect()` for specificity tracking
4. Key specificity values:
   - ID: `[1, 0, 0]`
   - Class, attribute, pseudo-class: `[0, 1, 0]`
   - Type (tag): `[0, 0, 1]`
   - Universal: `[0, 0, 0]`
   - `:where()`: Always `[0, 0, 0]`
5. Add a test case reproducing the incorrect calculation
6. Fix and verify

### 5. Adding a New Regex Combinator

To add a new combinator for regex selectors:

1. Update the `RegexSelectorCombinator` type in `src/types.ts`:
   ```typescript
   export type RegexSelectorCombinator = ' ' | '>' | '+' | '~' | ':has(+)' | ':has(~)' | ':new()';
   ```
2. Add the traversal logic in `src/match-selector.ts` in the `SelectorTarget.match()` switch:
   ```typescript
   case ':new()': {
     // Implement DOM traversal logic
   }
   ```
3. Add tests for the new combinator
4. Update documentation
5. Build: `yarn build --scope @markuplint/selector`

## Troubleshooting

### Selector Parse Errors

**Symptom:** `InvalidSelectorError` thrown for a valid-looking selector.

**Diagnosis:**

1. Check if `postcss-selector-parser` supports the selector syntax
2. Test the selector in isolation:
   ```typescript
   import parser from 'postcss-selector-parser';
   parser().processSync('your-selector');
   ```
3. Some selectors may require specific `postcss-selector-parser` versions

### Matching Mismatches

**Symptom:** A selector matches or doesn't match when it should/shouldn't.

**Diagnosis:**

1. Enable debug logging: `DEBUG=selector* yarn test --scope @markuplint/selector`
2. Check the `SelectorTarget` matching order -- components are checked sequentially and fail on first mismatch
3. Verify namespace resolution for HTML/SVG elements using `resolveNamespace()`
4. For extended pseudo-classes, verify that `specs` are being passed to `createSelector()`

### Specificity Calculation Issues

**Symptom:** Rules with higher specificity are not taking precedence.

**Diagnosis:**

1. Log the specificity values returned by `matchSelector()` or `Selector.match()`
2. Check `compareSpecificity()` comparison logic
3. Verify `:where()` is correctly returning `[0, 0, 0]`
4. For nested pseudo-classes (`:not(:is(.a, .b))`), trace through the recursive specificity calculation

## Dependency Notes

### postcss-selector-parser

- Provides the CSS selector AST used throughout `selector.ts`
- Key types: `parser.Selector`, `parser.Node`, `parser.Pseudo`, `parser.Attribute`, `parser.ClassName`, `parser.Identifier`, `parser.Tag`, `parser.Universal`, `parser.Combinator`
- Breaking changes in major versions may affect AST node structure

### @markuplint/ml-spec

- Provides `getComputedRole()`, `getAccname()`, `contentModelCategoryToTagNames()`, `resolveNamespace()`
- Type changes in `MLMLSpec` may affect extended pseudo-class implementations

### jsdom (dev)

- Provides `JSDOM` for creating DOM environments in tests
- Elements created via `jsdom` have standard DOM APIs used by the selector matching logic
