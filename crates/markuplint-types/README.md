# markuplint-types (Rust crate)

Rust implementation of CSS type validation for markuplint. Part of the [Rust rewrite initiative](https://github.com/markuplint/markuplint/issues/3178).

## Modules

```
markuplint-types/
├── src/
│   ├── css/
│   │   ├── syntax_definition/   Phase 1B-1: CSS Value Definition Syntax parser
│   │   │   ├── ast.rs           AST types (SyntaxNode, Combinator, Multiplier, etc.)
│   │   │   ├── mod.rs           parse() — syntax string → AST
│   │   │   ├── generate.rs      AST → syntax string (round-trip)
│   │   │   └── scanner.rs       Character-level scanner
│   │   │
│   │   └── value_match/         Phase 1B-2: CSS value matching engine
│   │       ├── mod.rs           Public API: match_syntax(), match_property()
│   │       ├── tokenizer.rs     CSS value tokenizer (CSS Syntax Level 3)
│   │       ├── token.rs         Token types
│   │       ├── matcher.rs       Core matching engine (recursive descent + backtracking)
│   │       ├── generic.rs       Built-in type matchers (<number>, <length>, <bcp-47>, etc.)
│   │       ├── units.rs         CSS unit table (50+ units)
│   │       ├── calc.rs          calc() expression parser + type checker (CSS Values Level 4)
│   │       ├── registry.rs      Syntax registry (mdn-data + markuplint custom types)
│   │       └── error.rs         MatchResult, MismatchInfo
│   │
│   ├── spec/                     Phase 2: Spec data types, loader, lookup, ARIA, and content model
│   │   ├── mod.rs               load_spec() — JSON → MLMLSpec
│   │   ├── types.rs             Serde types (MLMLSpec, ElementSpec, Attribute, ARIA, etc.)
│   │   ├── lookup.rs            Spec queries (get_spec, is_void_element, get_attr_specs, etc.)
│   │   ├── aria.rs              ARIA role resolution (implicit/explicit role, permitted roles)
│   │   └── content_model/       Phase 2-4: Content model pattern matching engine
│   │       ├── mod.rs           get_content_model(), matches_model_ref()
│   │       ├── serde_types.rs   Serde types (ContentModel, PermittedContentPattern, etc.)
│   │       ├── matching.rs      Core engine: order, choice, count_pattern, recursive_branch
│   │       ├── result.rs        MatchResult, ResultType, Hints, Collection
│   │       └── child_node.rs    ChildNodeInfo — lightweight node representation
│   │
│   ├── check/                   Type check dispatcher
│   ├── whatwg/                   WHATWG type validators (datetime, autocomplete, etc.)
│   ├── w3c/                     W3C type validators (permissions policy)
│   ├── rfc/                     RFC type validators (BCP-47, MIME)
│   └── ...
│
├── data/                        CSS data files from mdn-data (see data/README.md)
└── tests/                       Integration tests
```

## Architecture: syntax_definition → value_match

```
CSS syntax string               CSS value string
"<length> | auto"                "10px"
        │                             │
        ▼                             ▼
┌──────────────────┐      ┌──────────────────┐
│ syntax_definition │      │    tokenizer     │
│   parse()        │      │    tokenize()    │
└────────┬─────────┘      └────────┬─────────┘
         │ SyntaxNode AST          │ Token[]
         ▼                         ▼
     ┌─────────────────────────────────┐
     │          matcher                │
     │  Matcher::match_node()          │
     │  ├─ Keyword match              │
     │  ├─ Combinator (|, &&, ||)     │
     │  ├─ Multiplier (?, +, *, #)    │
     │  ├─ generic.rs (built-in types)│
     │  ├─ registry.rs (mdn-data     │
     │  │   + custom SVG/animation)   │
     │  ├─ calc.rs (type checking)    │
     │  └─ var()/env() validation     │
     └────────────┬────────────────────┘
                  │
                  ▼
            MatchResult
            Ok(()) or Err(MismatchInfo)
```

## Design Decisions

### Why recursive descent instead of graph compilation?

css-tree compiles syntax definitions into a DAG (match graph) then uses a stack-based state machine. We chose recursive descent with backtracking because:

- Rust's performance makes graph compilation unnecessary for our use case
- The code is significantly simpler and more maintainable
- Phase 1B-1's AST can be used directly without transformation

### Why calc() type checking?

css-tree accepts `calc()` contents without validation. We implement CSS Values Level 4 type checking because:

- It catches real errors: `calc(10px + 5deg)` is an invalid operation (length + angle)
- The algorithm is O(n) — no performance concern
- Currently type mismatches are accepted (not rejected) to maintain css-tree compatibility during the transition period

### Why CalcType::DimensionPercentage?

CSS allows mixing dimensions with percentages in calc expressions. For example:
- `calc(100% - 20px)` has type `<length-percentage>` (not `<length>` or `<percentage>`)
- This combined type is valid wherever `<length>`, `<percentage>`, or `<length-percentage>` is expected
- Without `DimensionPercentage`, we cannot correctly represent the result type of mixed expressions

### Built-in types vs. registry types

Built-in types (handled by `generic.rs`) take priority over mdn-data registry definitions. This is because:
- mdn-data sometimes defines types more permissively (e.g., `<integer>` as `<number-token>`)
- Built-in matchers enforce stricter CSS spec semantics (e.g., `<integer>` rejects `3.14`)
- Non-built-in types (e.g., `<color>`, `<position>`) are resolved from the registry

### Math function list exhaustiveness

The math function list in `generic.rs` covers all functions defined in CSS Values Level 4:
- Arithmetic: `calc`, `min`, `max`, `clamp`
- Stepped values: `round`, `mod`, `rem`
- Trigonometric: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`
- Exponential: `pow`, `sqrt`, `hypot`, `log`, `exp`
- Sign-related: `abs`, `sign`

When CSS adds new math functions, both `MATH_FUNCTIONS` in `generic.rs` and the match arms in `calc.rs` must be updated.

### Why hardcoded custom types instead of css-tree's fork()?

css-tree provides a `fork()` API for 3rd-party consumers to inject custom syntax definitions. Since markuplint owns the Rust implementation, a generic extension API is unnecessary. Instead, custom type definitions are hardcoded in `registry.rs::custom_syntaxes()`:

- **SVG transform overrides** (`translate()`, `scale()`, `rotate()`, `skew()`) — from `css-overrides.ts`
- **SVG/animation attribute types** (`<view-box>`, `<preserve-aspect-ratio>`, `<dasharray>`, etc.) — from `css-defs.ts`
- **Always-pass stub types** (`<svg-font-size>`, `<animatable-value>`, etc.) — TS also has no validation for these
- **`<bcp-47>`** — built-in type in `generic.rs`, delegates to the existing Rust BCP-47 validator

To add a new custom type, add an entry to `custom_syntaxes()` in `registry.rs`. Keep it in sync with the TS source files listed in the function's doc comment.

## CSS Spec References

| Module | Spec |
|--------|------|
| tokenizer | [CSS Syntax Module Level 3 § Tokenization](https://drafts.csswg.org/css-syntax/#tokenization) |
| calc type checking | [CSS Values Level 4 § Type Checking](https://drafts.csswg.org/css-values/#calc-type-checking) |
| units | [CSS Values Level 4 § Unit Table](https://drafts.csswg.org/css-values/#lengths) |
| generic types | [CSS Values Level 4 § Component Value Types](https://drafts.csswg.org/css-values/#component-types) |

## Testing

```bash
cargo test -p markuplint-types
```
