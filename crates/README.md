# Rust Crates

Rust implementation of markuplint's core components: DOM layer and type validation. These crates provide high-performance alternatives to the TypeScript implementations.

## Crate Structure

```
crates/
├── markuplint-core/      MLAST serde types (deserialization from JSON)
├── markuplint-dom/       Arena-based DOM tree (builder + traversal + attr helpers)
├── markuplint-napi/      Node.js bridge via napi-rs v3
├── markuplint-rules/     Content model matching + ARIA algorithms (isExposed, mayBeFocusable)
├── markuplint-selector/  CSS selector parser + matcher (with :model/:role/:aria)
└── markuplint-types/     Type validation and spec data (serde types, lookup)
```

### markuplint-core

Rust equivalents of the TypeScript types in `@markuplint/ml-ast`. Deserializes MLAST JSON (produced by any markuplint parser) into Rust structs using serde.

Key types: `MLASTDocument`, `MLASTElement`, `MLASTText`, `MLASTComment`, `MLASTDoctype`, `MLASTPSBlock`, `MLASTInvalid`, `NamespaceURI`.

### markuplint-dom

Converts an `MLASTDocument` into an arena-based DOM tree (`DomArena`). All nodes are stored in a single `Vec<DomNode>` and cross-referenced by index (`NodeId = usize`), avoiding lifetime complexity.

Provides traversal: parent, children, siblings, ancestors (bottom-up), descendants (depth-first pre-order), and element iteration.

### markuplint-napi

Exposes Rust modules to Node.js via napi-rs. This crate compiles to a platform-specific `.node` binary. Provides:

- **NapiDom**: DOM tree from MLAST JSON with traversal queries
- **Primitive validators**: `isInt`, `isUint`, `isFloat`, `isQuantity`, `range`, `splitUnit`
- **CSS value matching**: `matchCssSyntax(syntax, value)` and `matchCssProperty(syntax, value)` — validates CSS values against Value Definition Syntax, including calc() type checking and var() validation
- **`lint(mlastJson, configJson, specJson)`**: Full lint pipeline — runs all enabled Rust rules and returns violations

### markuplint-rules

Content model validation rules. Bridges `markuplint-types` (spec data) and `markuplint-selector` (CSS selector matching) — exists as a separate crate to avoid a circular dependency between those two.

- **Content model matching engine**: order, choice, quantifiers, backtracking (ported from `@markuplint/rules/permitted-contents/`)
- **CSS selector integration**: `:not()`, `:has()`, `:is()` via arena bridge to `markuplint-selector`
- **Arena bridge**: converts lightweight `ChildNodeInfo` to minimal `DomArena` for selector evaluation
- **ARIA algorithms**: `get_computed_role()` (Phase 2-3b), `get_accname()` (Phase 2-3c: AccName 1.2 §4.3.2), `is_exposed()` (Phase 2-3d), `may_be_focusable()`
- **Lint engine**: `Rule` trait, `lint()` function (MLAST + config + spec → violations), config parsing
- **Built-in rules**: `attr-duplication`

### markuplint-types

Rust implementation of `@markuplint/types` and spec-related modules. Contains:

- **CSS Value Definition Syntax parser** (Phase 1B-1): Parses syntax strings like `<length> | auto` into AST
- **CSS value matching engine** (Phase 1B-2): Matches CSS values against syntax definitions, with `calc()` type checking and `var()` validation
- **Spec data types and loader** (Phase 2): Deserializes HTML spec JSON, provides lookup functions, ARIA role resolution
- **Content model serde types** (Phase 2-4): `ContentModel`, `PermittedContentPattern`, `matches_model_ref()` — matching engine is in `markuplint-rules`

See `crates/markuplint-types/README.md` for detailed architecture and design decisions.

## Prerequisites

- Rust (stable, edition 2024)
- Node.js 22+ (for napi build/test)
- napi-rs CLI: `npm install -g @napi-rs/cli`

## Development

```bash
# From the crates/ directory:
cargo fmt --check       # Check formatting
cargo clippy -- -D warnings  # Lint
cargo test              # Run all tests
```

## Building the napi binary

```bash
# From the repository root:
yarn workspace @markuplint/core run build:napi        # Release build
yarn workspace @markuplint/core run build:napi:debug  # Debug build
```

The `.node` binary is output to `packages/@markuplint/core/`.

## Architecture

### DOM Layer

```
TS html-parser
     │  parser.parse(html)
     ▼
MLAST JSON string
     │  NapiDom::new(json)
     ▼
markuplint-core     serde deserialize → MLASTDocument
     │
     ▼
markuplint-dom      build() → DomArena (Vec<DomNode> + UUID index)
     │
     ▼
markuplint-napi     NapiDom / NapiNode / NapiElement → JavaScript
     │
     ▼
@markuplint/core    index.js (platform-specific .node loader)
```

### Type Validation Layer

```
CSS syntax string     CSS value string
"<length> | auto"     "10px"
        │                   │
        ▼                   ▼
markuplint-types    parse() → AST    tokenize() → Token[]
                         │                  │
                         └──── matcher ─────┘
                                │
                                ▼
                          MatchResult (Ok / Err with position info)
```

## Relationship to TypeScript packages

The Rust DOM is exposed as `@markuplint/core` (TS package). It is currently `private: true` and not consumed by other packages. The long-term goal is to replace the MLDOM layer in `@markuplint/ml-core` with this Rust implementation.

`markuplint-types` is the Rust counterpart of `@markuplint/types`. It will be exposed via napi-rs in Phase 1B-4 to replace the CSS validation portion of the TypeScript package.

## References

- [napi-rs documentation](https://napi.rs/)
- [markuplint ARCHITECTURE.md](../docs/architectures/ARCHITECTURE.md)
- MLAST type definitions: `packages/@markuplint/ml-ast/src/types.ts`
- TS MLDOM: `packages/@markuplint/ml-core/src/ml-dom/`
