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

Changes to this package can affect all 6 downstream parser packages:

| Package                     | Key Dependencies                                                      |
| --------------------------- | --------------------------------------------------------------------- |
| `@markuplint/html-parser`   | Parser base class, visitText with researchTags                        |
| `@markuplint/jsx-parser`    | Parser base class, visitAttr with quoteSet, detectElementType         |
| `@markuplint/vue-parser`    | Parser base class, visitAttr, flattenNodes, detectElementType         |
| `@markuplint/svelte-parser` | Parser base class, visitText, visitPsBlock, visitChildren, ignoreTags |
| `@markuplint/astro-parser`  | Parser base class (via html-parser)                                   |
| `@markuplint/pug-parser`    | Parser base class                                                     |

Always run tests across all parser packages when modifying the Parser class:

```shell
yarn test --scope @markuplint/html-parser --scope @markuplint/jsx-parser \
  --scope @markuplint/vue-parser --scope @markuplint/svelte-parser \
  --scope @markuplint/astro-parser --scope @markuplint/pug-parser
```

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
