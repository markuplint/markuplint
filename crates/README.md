# Rust Crates

Rust implementation of markuplint's core components: DOM layer and type validation. These crates provide high-performance alternatives to the TypeScript implementations.

## Crate Structure

```
crates/
├── markuplint-core/         MLAST serde types (deserialization from JSON)
├── markuplint-dom/          Arena-based DOM tree (builder + traversal + attr helpers)
├── markuplint-html-parser/  WHATWG-conformant HTML parser (tokenizer + tree construction)
├── markuplint-builder/         Node.js bridge via napi-rs v3
├── markuplint-rules/        Content model matching + ARIA algorithms (isExposed, mayBeFocusable)
├── markuplint-selector/     CSS selector + regex selector matching (with :model/:role/:aria)
└── markuplint-types/        Type validation and spec data (serde types, lookup)
```

### markuplint-core

Rust equivalents of the TypeScript types in `@markuplint/ml-ast`. Deserializes MLAST JSON (produced by any markuplint parser) into Rust structs using serde.

Key types: `MLASTDocument`, `MLASTElement`, `MLASTText`, `MLASTComment`, `MLASTDoctype`, `MLASTPSBlock`, `MLASTInvalid`, `NamespaceURI`.

### markuplint-dom

Converts an `MLASTDocument` into an arena-based DOM tree (`DomArena`). All nodes are stored in a single `Vec<DomNode>` and cross-referenced by index (`NodeId = usize`), avoiding lifetime complexity.

Provides traversal: parent, children, siblings, ancestors (bottom-up), descendants (depth-first pre-order), and element iteration.

### markuplint-builder

Exposes Rust modules to Node.js via napi-rs. This crate compiles to a platform-specific `.node` binary. Provides:

- **NapiDom**: DOM tree with traversal queries. Two construction paths:
  - `new NapiDom(mlastJson)` — from MLAST JSON (TS parser output)
  - `NapiDom.fromHtml(html)` — direct HTML parsing via Rust (no MLAST intermediate)
- **Primitive validators**: `isInt`, `isUint`, `isFloat`, `isQuantity`, `range`, `splitUnit`
- **CSS value matching**: `matchCssSyntax(syntax, value)` and `matchCssProperty(syntax, value)` — validates CSS values against Value Definition Syntax, including calc() type checking and var() validation
- **`lint(mlastJson, configJson, specJson)`**: Lint pipeline from MLAST JSON — runs all enabled Rust rules and returns violations
- **`lintHtml(html, configJson, specJson)`**: Full Rust lint pipeline — parses HTML via Rust WHATWG parser, builds DOM, runs rules. No MLAST JSON intermediate. Uses `should_parse_as_document()` to treat `<body>`/`<head>` starting inputs as documents

### markuplint-rules

Content model validation rules. Bridges `markuplint-types` (spec data) and `markuplint-selector` (CSS selector matching) — exists as a separate crate to avoid a circular dependency between those two.

- **Content model matching engine**: order, choice, quantifiers, transparent model, conditional content model, namespace-aware lookup, backtracking (ported from `@markuplint/rules/permitted-contents/`)
- **CSS selector integration**: `:not()`, `:has()`, `:is()` via arena bridge to `markuplint-selector`
- **Arena bridge**: converts lightweight `ChildNodeInfo` to minimal `DomArena` for selector evaluation
- **ARIA algorithms**: `get_computed_role()` (Phase 2-3b), `get_accname()` (Phase 2-3c: AccName 1.2 §4.3.2), `is_exposed()` (Phase 2-3d), `may_be_focusable()`
- **AriaResolver trait bridge**: `markuplint-selector` defines an `AriaResolver` trait for `:role()` / `:aria()` pseudo-class resolution. `markuplint-rules` implements it as `SpecAriaResolver`, breaking the circular dependency (selector → rules → selector)
- **Lint engine**: `Rule` trait, `lint()` function (MLAST + config + spec → violations), config parsing
- **Built-in rules** (43): `attr-duplication`, `attr-value-quotes`, `case-sensitive-attr-name`, `case-sensitive-tag-name`, `character-reference`, `class-naming`, `deprecated-attr`, `deprecated-element`, `disallowed-element`, `doctype`, `end-tag`, `heading-levels`, `id-duplication`, `ineffective-attr`, `invalid-attr`, `label-has-control`, `landmark-roles`, `link-types`, `neighbor-popovers`, `no-ambiguous-navigable-target-names`, `no-boolean-attr-value`, `no-consecutive-br`, `no-default-value`, `no-duplicate-dt`, `no-empty-palpable-content`, `no-hard-code-id`, `no-orphaned-end-tag`, `no-refer-to-non-existent-id`, `no-unsupported-features`, `no-use-event-handler-attr`, `permitted-contents`, `placeholder-label-option`, `redundant-accessible-name`, `require-accessible-name`, `require-datetime`, `require-dialog-autofocus`, `required-attr`, `required-element`, `required-h1`, `srcset-sizes-constraint`, `table-row-column-alignment`, `use-list`, `wai-aria`

### markuplint-types

Rust implementation of `@markuplint/types` and spec-related modules. Contains:

- **CSS Value Definition Syntax parser** (Phase 1B-1): Parses syntax strings like `<length> | auto` into AST
- **CSS value matching engine** (Phase 1B-2): Matches CSS values against syntax definitions, with `calc()` type checking and `var()` validation
- **Spec data types and loader** (Phase 2): Deserializes HTML spec JSON, provides lookup functions, ARIA role resolution
- **Content model serde types** (Phase 2-4): `ContentModel`, `PermittedContentPattern`, `matches_model_ref()` — matching engine is in `markuplint-rules`

See `crates/markuplint-types/README.md` for detailed architecture and design decisions.

### markuplint-html-parser

WHATWG-conformant HTML parser implementing §13.2.5 (tokenization) and §13.2.6 (tree construction). Replaces parse5 with a pure Rust implementation. Zero runtime dependencies.

- **Tokenizer**: Full 80-state state machine with position tracking on all tokens
- **Named character references**: Complete WHATWG entity table (2231 entries), generated at build time from `entities.json`
- **Tree construction**: All 23 insertion modes, adoption agency, foster parenting, foreign content (SVG/MathML), customizable `<select>`, fragment parsing
- **Conformance**: [html5lib-tests](https://github.com/html5lib/html5lib-tests) — **tokenizer 6806/6806 (100%)**, **tree construction 1777/1778 (1 documented spec/test divergence skip)**
- **Fragment detection**: Two heuristics are provided:
  - `is_document_fragment(html)` — general-purpose, mirrors TS `isDocumentFragment()`. Treats `<body>`/`<head>` as fragments (matching parse5 behavior)
  - `should_parse_as_document(html)` — lint-aware, also treats `<body>`/`<head>` as documents. In fragment mode the WHATWG parser drops these tags, which loses parent context needed by `permitted-contents`. Use this for `lintHtml()`

Source files map to WHATWG spec sections:
| File | WHATWG Section |
|------|---------------|
| `src/tokenizer/` | §13.2.5 Tokenization |
| `src/tree_construction/mod.rs` | §13.2.6 Tree construction |
| `src/tree_construction/adoption_agency.rs` | §13.2.6.4.7 Adoption agency |
| `src/tree_construction/foreign_content.rs` | §13.2.6.5 Foreign content |
| `src/tree_construction/table_modes.rs` | §13.2.6.4 Table-related modes |
| `src/input.rs` | §13.2.3.5 Input stream preprocessing |
| `src/tables.rs` | Element categories (void, formatting, special, implied end tags) |
| `src/tree/` | Internal arena-based tree (nodes, attributes, spans) |

#### Submodule setup

The html5lib-tests conformance suite is included as a git submodule. After cloning, run:

```bash
git submodule update --init --recursive
```

#### Updating html5lib-tests

When the upstream html5lib-tests repo is updated:

```bash
cd crates/markuplint-html-parser/tests/html5lib-tests
git pull origin master
cd ../../../..
cargo test -p markuplint-html-parser
```

If new tests fail, either fix the parser or add the test to `SKIP_TESTS` in `html5lib_tree.rs` with a documented reason. The test harness enforces `assert_eq!(total_failed, 0)` — no numeric thresholds.

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

Two construction paths:

```
Path A: TS parser (current)          Path B: Rust parser (new)

TS html-parser (parse5)              HTML string
     │  parser.parse(html)                │  NapiDom.fromHtml(html)
     ▼                                    ▼
MLAST JSON string                    markuplint-html-parser
     │  NapiDom::new(json)                │  parse() → Arena
     ▼                                    ▼
markuplint-core                      markuplint-dom
  serde → MLASTDocument                html_builder → DomArena
     │                                    │
     └──────────────┬─────────────────────┘
                    ▼
              markuplint-builder
         NapiDom / NapiNode / NapiElement → JavaScript
                    │
                    ▼
            @markuplint/core
         index.js (platform-specific .node loader)
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

## Known behavioral differences (Rust vs TS)

The Rust `permitted-contents` rule aims for full parity with
`@markuplint/rules/src/permitted-contents/`. Remaining differences:

| Area | Rust behavior | TS behavior |
|------|---------------|-------------|
| `<image>` element | Converted to `<img>` per WHATWG §13.2.6.4.7 | Preserved as `image` (parse5 behavior) |
| `:has()` descent in non-transparent models | Reports the container that fails `:has()` | Reports the deeply nested descendant via `descendants()` |
| Per-element rule config | Not yet supported | `rule: [{ tag, contents }]` overrides |
| Framework parser tests | Skipped (26 tests) | All pass with JSX/Vue/Svelte/etc. parsers |

See `permitted_contents.rs` module doc for the full TS↔Rust
correspondence table.

## References

- [napi-rs documentation](https://napi.rs/)
- [markuplint ARCHITECTURE.md](../docs/architectures/ARCHITECTURE.md)
- MLAST type definitions: `packages/@markuplint/ml-ast/src/types.ts`
- TS MLDOM: `packages/@markuplint/ml-core/src/ml-dom/`
- TS permitted-contents: `packages/@markuplint/rules/src/permitted-contents/`
