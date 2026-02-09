# Maintenance Guide

## Commands

| Command                                      | Description            |
| -------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/html-parser` | Build this package     |
| `yarn dev --scope @markuplint/html-parser`   | Watch mode build       |
| `yarn clean --scope @markuplint/html-parser` | Remove build artifacts |
| `yarn test --scope @markuplint/html-parser`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located in the `src/` directory:

| Test File                              | Coverage                                                            |
| -------------------------------------- | ------------------------------------------------------------------- |
| `index.spec.ts`                        | HtmlParser integration tests (parsing HTML documents and fragments) |
| `get-namespace.spec.ts`                | Namespace resolution for HTML, SVG, and MathML elements             |
| `optimize-starts-head-or-body.spec.ts` | Head/body tag optimization setup and resume                         |

The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';
import { parser } from '@markuplint/html-parser';

const doc = parser.parse('<div class="foo">text</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

## Recipes

### 1. Modifying an HtmlParser Override Method

1. Read `src/parser.ts` and identify the override method to change
2. Review the base `Parser` class in `@markuplint/parser-utils` to understand the parent behavior
3. Make the change, ensuring `super.*()` calls are preserved where required:
   - `beforeParse()` — must call `super.beforeParse()` first
   - `afterParse()` — must call `super.afterParse()` first
   - `afterNodeize()` — must call `super.afterNodeize()` first
   - `visitText()` — calls `super.visitText()` with options
4. Build: `yarn build --scope @markuplint/html-parser`
5. Run tests: `yarn test --scope @markuplint/html-parser`
6. Check downstream impact (see checklist below)

### 2. Modifying Ghost Element Handling

1. Read the `nodeize()` method in `src/parser.ts` — the ghost element branch is the `if (!location)` block
2. Read the `afterNodeize()` method to understand how `afterPosition` state is maintained
3. Make changes to the position calculation or element creation logic
4. Build and test: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. Test with HTML that triggers ghost elements (e.g., `<div>text</div>` parsed as a document — will create ghost `<html>`, `<head>`, `<body>`)

### 3. Adding a New Namespace

1. Read `src/get-namespace.ts`
2. Add a new `case` in the `switch (parentNamespace)` block for the new namespace URI
3. Choose an appropriate wrapper element for the new namespace
4. Build and test: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. Add test cases to `src/get-namespace.spec.ts`

### 4. Modifying Head/Body Optimization

1. Read `src/optimize-starts-head-or-body.ts`
2. The module has three key functions:
   - `isStartsHeadTagOrBodyTag()` — detection regex
   - `optimizeStartsHeadTagOrBodyTagSetup()` — placeholder replacement
   - `optimizeStartsHeadTagOrBodyTagResume()` — name restoration
3. Make changes, paying attention to:
   - The placeholder character `\uFFFD` (Unicode Replacement Character) must remain unique
   - The `replaceAll` regex must match both opening and closing tags
   - Restoration must handle both `starttag` and `endtag` node types
4. Build and test: `yarn build --scope @markuplint/html-parser && yarn test --scope @markuplint/html-parser`
5. Add or update test cases in `src/optimize-starts-head-or-body.spec.ts`

## Downstream Impact Checklist

Changes to this package can affect 4 downstream parser packages:

| Package                     | Relationship         | Key Dependencies                          |
| --------------------------- | -------------------- | ----------------------------------------- |
| `@markuplint/jsx-parser`    | Extends `HtmlParser` | All override methods, constructor options |
| `@markuplint/vue-parser`    | Imports `HtmlParser` | `tokenize()`, `nodeize()`                 |
| `@markuplint/svelte-parser` | Imports `HtmlParser` | `tokenize()`, `nodeize()`                 |
| `@markuplint/astro-parser`  | Imports `HtmlParser` | `tokenize()`, `nodeize()`                 |

Always run downstream parser tests when modifying `HtmlParser`:

```shell
yarn test --scope @markuplint/html-parser --scope @markuplint/jsx-parser \
  --scope @markuplint/vue-parser --scope @markuplint/svelte-parser \
  --scope @markuplint/astro-parser
```

## Troubleshooting

### Ghost element position is incorrect

**Symptom:** Ghost elements (`<html>`, `<head>`, `<body>`) have wrong line/column/offset values in the AST.

**Cause:** The `afterPosition` state is not being updated correctly, or the depth check in `nodeize()` is wrong.

**Solution:**

1. Check `afterNodeize()` — ensure `this.state.afterPosition` is updated with the correct `endOffset`, `endLine`, `endCol`, and `depth`
2. Check the ghost element branch in `nodeize()` — the `depth === this.state.afterPosition.depth` comparison must match

### Head/body tag parsing produces unexpected results

**Symptom:** When source starts with `<head>` or `<body>`, the parsed AST contains placeholder names or missing elements.

**Cause:** The optimization setup or resume step has a bug.

**Solution:**

1. Check `isStartsHeadTagOrBodyTag()` — ensure the detection regex matches the input
2. Check `optimizeStartsHeadTagOrBodyTagSetup()` — verify placeholder names are correctly generated
3. Check `optimizeStartsHeadTagOrBodyTagResume()` — verify original names are restored for both start and end tags

### Namespace resolution returns wrong value

**Symptom:** SVG or MathML elements are assigned the wrong namespace URI.

**Cause:** The parent namespace context is not being passed correctly, or parse5 resolves the namespace differently than expected.

**Solution:**

1. Check the calling code — ensure `originNode.namespaceURI` is being read correctly in `nodeize()`
2. Check `getNamespace()` — add a test case with the specific tag name and parent namespace combination
3. Note that parse5 may apply integration point rules that change the namespace
