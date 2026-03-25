# Rust Crates

Rust implementation of markuplint's core components: DOM layer and type validation. These crates provide high-performance alternatives to the TypeScript implementations.

## Crate Structure

```
crates/
├── markuplint-core/    MLAST serde types (deserialization from JSON)
├── markuplint-dom/     Arena-based DOM tree (builder + traversal)
├── markuplint-napi/    Node.js bridge via napi-rs v3
└── markuplint-types/   CSS type validation (syntax parser + value matching engine)
```

### markuplint-core

Rust equivalents of the TypeScript types in `@markuplint/ml-ast`. Deserializes MLAST JSON (produced by any markuplint parser) into Rust structs using serde.

Key types: `MLASTDocument`, `MLASTElement`, `MLASTText`, `MLASTComment`, `MLASTDoctype`, `MLASTPSBlock`, `MLASTInvalid`, `NamespaceURI`.

### markuplint-dom

Converts an `MLASTDocument` into an arena-based DOM tree (`DomArena`). All nodes are stored in a single `Vec<DomNode>` and cross-referenced by index (`NodeId = usize`), avoiding lifetime complexity.

Provides traversal: parent, children, siblings, ancestors (bottom-up), descendants (depth-first pre-order), and element iteration.

### markuplint-napi

Exposes the DOM to Node.js via napi-rs. The `NapiDom` class accepts MLAST JSON, builds the arena, and provides query methods. This crate compiles to a platform-specific `.node` binary.

### markuplint-types

Rust implementation of `@markuplint/types` — CSS type validation for attribute value checking. Contains:

- **CSS Value Definition Syntax parser** (Phase 1B-1): Parses syntax strings like `<length> | auto` into AST
- **CSS value matching engine** (Phase 1B-2): Matches CSS values against syntax definitions, with `calc()` type checking and `var()` validation

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
cargo test              # Run all tests (36 tests)
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
