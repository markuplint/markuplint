# Maintenance Guide

## Commands

| Command                                       | Description            |
| --------------------------------------------- | ---------------------- |
| `yarn build --scope @markuplint/parser-utils` | Build this package     |
| `yarn dev --scope @markuplint/parser-utils`   | Watch mode build       |
| `yarn clean --scope @markuplint/parser-utils` | Remove build artifacts |
| `yarn test --scope @markuplint/parser-utils`  | Run tests              |

## Testing

Test files follow the `*.spec.ts` naming convention and are located alongside source files. The primary testing pattern uses `nodeListToDebugMaps` for snapshot-style assertions:

```ts
import { nodeListToDebugMaps } from '@markuplint/parser-utils';

const doc = parser.parse('<div class="foo">text</div>');
const debugMaps = nodeListToDebugMaps(doc.nodeList, true);
expect(debugMaps).toStrictEqual([
  // expected debug output
]);
```

### Debug Utilities for Testing

- **`nodeListToDebugMaps(nodeList, withAttr?)`** — Converts AST nodes to position-annotated debug strings
- **`attributesToDebugMaps(attributes)`** — Shows attribute decomposition (name, equal, value, quotes)
- **`nodeTreeDebugView(nodeTree, idFilter?)`** — Tree visualization with depth, parent-child links

## Recipes

### 1. Creating a New Parser

1. Create a new package under `packages/@markuplint/`
2. Extend `Parser<YourNode, YourState>`:

```ts
import { Parser } from '@markuplint/parser-utils';

class MyParser extends Parser<MyNode> {
  constructor() {
    super({
      endTagType: 'xml', // or 'omittable', 'never'
      tagNameCaseSensitive: true,
      ignoreTags: [
        // Patterns to mask before parsing
      ],
    });
  }

  tokenize() {
    const ast = myLanguageParser(this.rawCode);
    return { ast: ast.children, isFragment: true };
  }

  nodeize(originNode, parentNode, depth) {
    // Convert language-specific nodes using visitor methods
  }
}
```

3. Export as `MLParserModule`:

```ts
import { MyParser } from './parser.js';
export default { parser: new MyParser() };
```

See [Parser Class Reference — Implementing a Parser](parser-class.md#implementing-a-parser) for the full override pattern reference.

### 2. Adding a New Visitor Method

Visitor methods are called from `nodeize()`. To add support for a new node type:

1. Add a method to your parser subclass that creates the appropriate AST node
2. Call the method from your `nodeize()` implementation
3. Use `this.createToken()` to create tokens and `this.sliceFragment()` to extract source fragments

### 3. Adding an IgnoreTag Pattern

Add to the `ignoreTags` array in your parser's constructor:

```ts
super({
  ignoreTags: [
    { type: 'mustache', start: '{{', end: '}}' },
    { type: 'erb', start: '<%', end: '%>' },
    { type: 'Style', start: '<style', end: '</style>' },
  ],
});
```

- `type` becomes the `#ps:` prefix in the restored psblock node name
- `start` and `end` can be strings or RegExp patterns
- The mask character can be customized via `maskChar` option

### 4. Customizing Attribute Parsing

Override `visitAttr()` with custom options:

```ts
visitAttr(token: Token) {
  const attr = super.visitAttr(token, {
    quoteSet: [
      { start: '"', end: '"', type: 'string' },
      { start: "'", end: "'", type: 'string' },
      { start: '{', end: '}', type: 'script', parser: customParser },
    ],
    startState: AttrState.BeforeName,
  });

  // Post-process for framework-specific directives
  if (attr.type === 'attr' && attr.name.raw.startsWith('v-')) {
    this.updateAttr(attr, { isDirective: true });
  }

  return attr;
}
```

### 5. Adding an IDL Attribute Mapping

The IDL attribute map is defined in `src/idl-attributes.ts`. To add a new mapping:

1. Add the entry to the `idlContentMap` object
2. The key is the IDL property name (camelCase)
3. The value is the content attribute name (lowercase)

## Downstream Impact Checklist

Changes to this package can affect every downstream parser:

| Package                     | Key Dependencies                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@markuplint/html-parser`   | Parser base class, visitText with researchTags                                                                                                                 |
| `@markuplint/jsx-parser`    | Parser base class, visitAttr with quoteSet, detectElementType, parseCodeFragment                                                                               |
| `@markuplint/vue-parser`    | Parser base class, visitAttr, flattenNodes, detectElementType                                                                                                  |
| `@markuplint/svelte-parser` | Parser base class, visitText, visitPsBlock, visitChildren, ignoreTags                                                                                          |
| `@markuplint/astro-parser`  | Parser base class (direct), visitElement, **parseCodeFragment with full element raw — the only caller that exercises the raw-text element body short-circuit** |
| `@markuplint/pug-parser`    | Parser base class                                                                                                                                              |

Always run tests across all parser packages when modifying the Parser class:

```shell
yarn test --scope @markuplint/html-parser --scope @markuplint/jsx-parser \
  --scope @markuplint/vue-parser --scope @markuplint/svelte-parser \
  --scope @markuplint/astro-parser --scope @markuplint/pug-parser
```

When touching `parseCodeFragment` (especially the raw-text element branch), `astro-parser` is the most sensitive caller — start there.

## Troubleshooting

### Template expressions cause parse errors

**Symptom:** Parsing fails on code like `<div class="{{ variable }}">`.

**Cause:** Template expressions are not being masked before HTML parsing.

**Solution:** Add an `IgnoreTag` pattern to `ignoreTags` in the parser constructor that matches the expression syntax.

### Attribute parsing fails

**Symptom:** `SyntaxError: Unclosed attribute value` or similar errors.

**Cause:** Non-standard attribute quoting (e.g., JSX expression braces) is not configured.

**Solution:** Override `visitAttr()` and pass a custom `quoteSet` that includes the language's expression delimiters.

### Front matter not detected

**Symptom:** YAML front matter appears as text nodes instead of a psblock.

**Cause:** `ignoreFrontMatter` is not enabled in parse options.

**Solution:** Ensure `options.ignoreFrontMatter` is `true` when calling `parse()`. Note: Svelte explicitly disables this.

### `<script>` or `<style>` body throws `Invalid tag syntax` from `parseCodeFragment`

**Symptom:** A subclass that hands the full element raw to `parseCodeFragment()` (e.g., `astro-parser`) throws `SyntaxError: Invalid tag syntax: "..."` when the script/style body contains HTML-like substrings such as `/<br\s*\/?>/gi` or `/* <br = */`. v4 backport of [#3825](https://github.com/markuplint/markuplint/issues/3825), tracked as [#3860](https://github.com/markuplint/markuplint/issues/3860).

**Cause:** Without raw-text awareness, `parseCodeFragment()` re-tokenizes the body and tries to parse the regex's `<br...>` as a start tag, hitting the `\s` (literal backslash) where an attribute name is expected.

**Solution:** The fix lives in `parseCodeFragment()` (`src/parser.ts`). After parsing a non-self-closing start tag whose `nodeName.toLowerCase()` matches `rawTextElements`, the body is consumed verbatim until the next ASCII-case-insensitive `</tagName` followed by a tab/LF/FF/CR/space/`>` /`/`, per [HTML Living Standard §13.2.5.1](https://html.spec.whatwg.org/multipage/syntax.html#cdata-rcdata-restrictions). If a regression is suspected:

1. Re-run the regression suite: `npx vitest run packages/@markuplint/astro-parser/src/parser.spec.ts -t "#3860"`.
2. Inspect `parseCodeFragment()` — confirm the raw-text branch is intact, the `#getRawTextCloseTagPattern()` cache is being consulted, and the close-tag regex still uses the spec character class `[\t\n\f\r >/]`.
3. The defensive jsx tests under `#3860 raw-text element body via JSX expression child` exist to lock in upstream invariants — they do **not** exercise the parser-utils raw-text branch directly (their bodies are expression children, not raw element source).

The dev (v5 RC) implementation landed first via [#3859](https://github.com/markuplint/markuplint/pull/3859) — diff-compare both PRs when porting future changes.

**Note on escapable raw text elements (`<title>`, `<textarea>`):** these are NOT in the default `rawTextElements`. HTML LS classifies them as escapable raw text — they require character-reference (`&amp;`) expansion that this branch does not implement. Add them to a parser's `rawTextElements` only if you accept that character refs in their body will be passed through verbatim instead of decoded.
