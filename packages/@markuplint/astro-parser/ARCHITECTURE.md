# @markuplint/astro-parser

## Overview

`@markuplint/astro-parser` is a parser for Astro component files (`.astro`) in markuplint. It uses `astro-eslint-parser` (which wraps `@astrojs/compiler`) to tokenize Astro source code, then converts the resulting AST into markuplint's unified AST format (`MLASTDocument`). The parser handles Astro-specific syntax including frontmatter blocks (`---...---`), expression containers (`{expression}`), template directives (e.g., `class:list`, `set:html`, `client:load`), and shorthand attributes (`{prop}`).

## Directory Structure

```
src/
├── index.ts                    — Re-exports parser instance
├── parser.ts                   — AstroParser class extending Parser<Node>
├── astro-parser.ts             — astro-eslint-parser wrapper and type re-exports
├── detect-block-behavior.ts    — Detects .map()/.filter() for block behavior
├── component-scanner.ts        — Component scanner for pretenders auto scan (subpath export)
├── parser.spec.ts              — AstroParser integration tests
├── astro-parser.spec.ts        — astro-eslint-parser wrapper tests
└── component-scanner.spec.ts   — Tests for component scanner
```

## Architecture Diagram

```mermaid
flowchart TD
    subgraph upstream ["Upstream"]
        mlAst["@markuplint/ml-ast\n(AST types)"]
        parserUtils["@markuplint/parser-utils\n(Abstract Parser class)"]
        astroEslintParser["astro-eslint-parser\n(Astro tokenizer)"]
        astroCompiler["@astrojs/compiler\n(AST types)"]
    end

    subgraph pkg ["@markuplint/astro-parser"]
        astroParser["AstroParser\nextends Parser‹Node›"]
        astroParseFn["astroParse()\nastro-eslint-parser wrapper"]
        detectBlock["detectBlockBehavior()\n.map()/.filter() detection"]
        spreadAttr["extractSpreadAttribute()\nbrace-aware spread extractor"]
        compScanner["componentScanner\n(subpath: ./component-scanner)"]
    end

    subgraph downstream ["Downstream"]
        mlCore["@markuplint/ml-core\n(MLASTDocument → MLDOM)"]
        pretenders["@markuplint/pretenders\n(auto scan)"]
    end

    mlAst -->|"AST types"| astroParser
    parserUtils -->|"Parser base class"| astroParser
    astroEslintParser -->|"parseTemplate()"| astroParseFn
    astroCompiler -->|"Node types"| astroParseFn
    astroParseFn -->|"RootNode.children"| astroParser
    detectBlock -->|"blockBehavior"| astroParser
    spreadAttr -->|"spread pre-pass in visitAttr()"| astroParser
    astroParser -->|"produces MLASTDocument"| mlCore
    astroParser -->|"parse()"| compScanner
    compScanner -->|"ComponentScanResult"| pretenders
```

## AstroParser Class

### Inheritance

```
Parser<Node>  (from @markuplint/parser-utils)
    └── AstroParser  (this package)
```

### Constructor

The constructor configures the base `Parser` with Astro-specific options:

| Option                 | Value        | Purpose                                                                      |
| ---------------------- | ------------ | ---------------------------------------------------------------------------- |
| `endTagType`           | `'xml'`      | Astro uses explicit closing tags like XML                                    |
| `selfCloseType`        | `'html+xml'` | Accepts both HTML void elements and XML-style self-closing (`<Component />`) |
| `tagNameCaseSensitive` | `true`       | Distinguishes components (`<MyComp>`) from HTML elements (`<div>`)           |

### Override Methods

| Method                | Purpose                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `tokenize()`          | Calls `astroParse()` to get the Astro AST, returns `{ ast: rootNode.children, isFragment: true }`                                    |
| `nodeize()`           | Converts Astro AST nodes to markuplint nodes, dispatching by node type (frontmatter, doctype, text, comment, element, expression)    |
| `afterFlattenNodes()` | Delegates to parent with `{ exposeInvalidNode: false }`                                                                              |
| `visitElement()`      | Parses the raw HTML fragment via `parseCodeFragment()` with `namelessFragment: true`, then delegates to parent with end tag handling |
| `visitChildren()`     | Delegates to parent, then asserts no unexpected sibling nodes remain                                                                 |
| `visitAttr()`         | Handles curly-brace expression values, shorthand attributes, and template directives                                                 |
| `detectElementType()` | Detects component vs HTML element using `/^[A-Z]/` pattern (capitalized names are components)                                        |

## Frontmatter Handling

Astro components can include a frontmatter block delimited by `---`:

```astro
---
const name = "World";
---
<div>{name}</div>
```

The `astro-eslint-parser` produces a node with `type: 'frontmatter'`. The parser converts this to a **psblock** (pseudo-block) with `nodeName: 'Frontmatter'` and `isFragment: false`. The entire `---...---` block including delimiters is captured as a single opaque node. Content inside the frontmatter is not parsed as HTML.

## Expression Handling

Astro expressions (`{expression}`) are represented as `type: 'expression'` nodes in the Astro AST. The parser converts these to **MustacheTag** psblock nodes.

### Simple Expressions

A simple expression like `{name}` has a single text child. The entire expression is emitted as one MustacheTag psblock with `isFragment: true`.

### Nested Expressions with HTML

When an expression contains HTML elements (e.g., `{list.map(item => <li>{item}</li>)}`), the parser splits it into multiple nodes:

1. **Opening expression fragment**: `{list.map(item => ` — a MustacheTag psblock containing the child nodes. If the expression contains a `.map()` or `.filter()` call (detected by `detectBlockBehavior()`), the opening fragment receives `blockBehavior: { type: 'each' }` or `{ type: 'if' }` respectively
2. **Nested HTML elements**: `<li>{item}</li>` — processed as normal elements
3. **Closing expression fragment**: `)}` — a separate MustacheTag psblock with `isFragment: false`. If the opening fragment had a `blockBehavior`, the closing fragment receives `blockBehavior: { type: 'end' }`

The splitting logic checks whether `firstChild !== lastChild` in the expression's children array. If so:

- The region from the expression start to the first child's end becomes the opening fragment
- The region from the last child's start to the expression end becomes the closing fragment
- The children between are visited normally within the opening fragment's psblock

## Attribute Processing

### Quote Set

The `visitAttr()` method uses a custom quote set that includes curly braces for expression values:

| Start | End | Type     |
| ----- | --- | -------- |
| `"`   | `"` | `string` |
| `'`   | `'` | `string` |
| `{`   | `}` | `script` |

### Shorthand Attributes

When an attribute token starts with `{` (e.g., `{prop}`), the parser sets `startState: AttrState.BeforeValue`, which skips name parsing and goes directly to value extraction. The resulting attribute has:

- `name.raw` = `''` (empty)
- `value.raw` = `prop`
- `potentialName` = `prop` (inferred from value)
- `isDynamicValue` = `true`

### Template Directives

Astro template directives use the `name:modifier` syntax. The parser detects these with the regex `/^([^:]+):([^:]+)$/`:

| Directive prefix | `potentialName` | `isDirective` | Behavior                                        |
| ---------------- | --------------- | ------------- | ----------------------------------------------- |
| `class:`         | `'class'`       | `false`       | Maps to standard `class` attribute              |
| `client:`        | —               | `true`        | Astro client directive (load, idle, visible...) |
| `server:`        | —               | `true`        | Astro server directive (defer)                  |
| `set:`           | —               | `true`        | Content directive (html, text)                  |
| `is:`            | —               | `true`        | Property directive (inline, raw)                |
| `define:`        | —               | `true`        | Style directive (vars)                          |
| `transition:`    | —               | `true`        | View Transition directive (animate, name)       |
| _(any other)_    | —               | `true`        | Catch-all: any `prefix:name` pattern            |

The `class:` prefix is special-cased: it gets `potentialName: 'class'` so markuplint rules for the `class` attribute apply. All other colon-separated prefixes hit the `default` case and get `isDirective: true`, which tells markuplint they are framework-specific and should not be validated as standard HTML attributes.

### Dynamic Values

Any attribute whose start quote is `{` gets `isDynamicValue: true`. This applies to:

- Explicit dynamic values: `prop={value}`
- Shorthand attributes: `{prop}`
- Nested expressions: `style={{ a: b }}`

### Spread Attributes

Spread attributes (`{...EXPR}`) are extracted by a brace-aware pre-pass in `visitAttr()` (see `src/spread-attr.ts`) **before** delegating to the base `Parser.visitAttr()`. The pre-pass walks the raw token character by character with awareness of:

- string literals (`'`, `"`)
- template literals with `${}` interpolation
- line (`//`) and block (`/* */`) comments
- backslash-escaped quotes (counting consecutive backslashes for parity)

This bypasses the upstream `safeScriptParser` (espree-based) for spread tokens because espree:

1. Does not understand TypeScript syntax such as `{...x as any}` and would terminate the spread early at `as`.
2. May greedily extend a "valid JS prefix" past the spread's closing `}` into surrounding HTML — for example `{...props}>{label}` is interpreted as a binary `>` expression, swallowing the next sibling and producing `Invalid tag syntax`.

Both failure modes were reported in [#3824](https://github.com/markuplint/markuplint/issues/3824) (v4) and tracked on dev as [#3856](https://github.com/markuplint/markuplint/issues/3856). The pre-pass solves them by treating the `{...}` boundary as a pure brace-matching problem.

**Known limitations** of the brace matcher:

- Regular-expression literals containing braces (e.g. `{...x.match(/}/) ? a : b}`) are not recognised — `/` is always treated as a division operator. Rewrite via a variable indirection if encountered.

**Retraction condition**: if `parser-utils/script-parser.ts` is upgraded to handle TypeScript syntax and to stop extending past the spread's `}`, this package's `src/spread-attr.ts` and the `visitAttr()` pre-pass can be removed and the base parser path restored.

**Independence from `detectBlockBehavior()`**: the spread pre-pass operates on attribute tokens, while `detectBlockBehavior()` runs over `expression` AST nodes — they share no state. The interaction is locked down by the `<Comp {...rest}>{list.map(...)}</Comp>` regression test in `parser.spec.ts`.

## Comparison with jsx-parser

| Feature                   | `astro-parser`                                   | `jsx-parser`                                    |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| **Tokenizer**             | `astro-eslint-parser`                            | TypeScript ESTree (`@typescript-eslint/parser`) |
| **Frontmatter**           | Supported (`---...---` psblock)                  | Not applicable                                  |
| **Expression syntax**     | `{expr}` as MustacheTag psblock                  | `{expr}` as JSXExpressionContainer psblock      |
| **Template directives**   | `class:list`, `set:html`, etc.                   | Not applicable                                  |
| **Namespace management**  | Delegates to base `Parser`                       | Delegates to `getNamespace()` from html-parser  |
| **Component detection**   | `/^[A-Z]/` pattern                               | `/^[A-Z]/` pattern                              |
| **Self-close type**       | `html+xml`                                       | Default (XML-only)                              |
| **Booleanish attributes** | Not configured                                   | `booleanish: true`                              |
| **Nameless fragments**    | `<>...</>` supported                             | `<>...</>` supported                            |
| **Spread attributes**     | Brace-aware pre-pass in `visitAttr()` (TS-aware) | Custom `visitSpreadAttr()` with IDL lookup      |

## Version Compatibility

The parsing chain depends on:

```
astro-eslint-parser → @astrojs/compiler → Astro syntax support
```

`astro-eslint-parser` is a runtime dependency that provides `parseTemplate()`. `@astrojs/compiler` is a dev dependency used only for AST type definitions (`Node`, `RootNode`, `ElementNode`, etc.). When updating `astro-eslint-parser`, the `@astrojs/compiler` dev dependency should also be updated to match the version that `astro-eslint-parser` uses internally.

## Key Source Files

| File                   | Purpose                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `parser.ts`            | `AstroParser` class — all override methods and namespace scoping                                   |
| `astro-parser.ts`      | `astroParse()` wrapper — delegates to `astro-eslint-parser`, converts diagnostics to `ParserError` |
| `spread-attr.ts`       | Brace-aware spread-attribute extractor used by `visitAttr()` (see Spread Attributes above)         |
| `index.ts`             | Public API — re-exports the singleton `parser` instance                                            |
| `component-scanner.ts` | Component scanner for `@markuplint/pretenders` auto scan (subpath export `./component-scanner`)    |

## Documentation Map

- [Maintenance Guide](docs/maintenance.md) -- Commands, recipes, and troubleshooting
