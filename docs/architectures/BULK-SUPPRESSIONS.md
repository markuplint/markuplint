# Bulk Suppressions — Design Document

This document describes the design philosophy, algorithm, and architecture of markuplint's bulk suppressions feature.

**Status:** Experimental
**Tracking Issues:** [#3503](https://github.com/markuplint/markuplint/issues/3503) (Phase 1), [#3509](https://github.com/markuplint/markuplint/issues/3509) (Phase 2)

## Problem Statement

When introducing new lint rules to an existing project, a large number of pre-existing violations are reported. This creates a dilemma:

- **Enable as `error`** → CI fails immediately on hundreds of existing violations
- **Enable as `warning`** → Nobody fixes them; new violations go unnoticed
- **Fix everything first** → Enormous effort; blocks other development
- **Disable the rule** → No benefit at all

Bulk suppressions offer a fourth option: **record existing violations and suppress them, while strictly enforcing the rule on new code.**

## Design Philosophy

### Precision Over Stability

When the scope selector breaks (e.g., after a DOM refactoring that renames an `id` or removes a `class`):

- The scope no longer matches any subtree → violation count in scope = 0
- Count comparison: 0 ≤ suppressed count → **suppression remains active**
- The entry becomes "unused" and `--prune-suppressions` recommends cleanup

**No false negatives.** A broken scope never causes new violations to be hidden. The worst case is that old violations stay suppressed slightly longer than intended, which `--prune-suppressions` or re-running `--suppress` corrects.

In contrast, using tag-name-only selectors (e.g., `div > div > div`) risks **false positives**: a different `div > div > div` elsewhere in the file could absorb new violations into the suppressed count, hiding regressions. This is the real danger.

**Conclusion:** Use id/class/attr for precise selectors. Accept that they may break on refactoring. The failure mode is safe.

### Count-Based Matching (ESLint-Compatible)

The core algorithm is deliberately simple:

```
For each (file, rule) pair:
  if current_violations ≤ suppressed_count → suppress all
  if current_violations > suppressed_count → report ALL (not just the delta)
```

**Why report ALL when exceeded?** If violations grew, the user needs the full picture to investigate. Reporting only "2 new violations" without context makes debugging harder.

**Why not track individual violations?** Line numbers shift with every edit. Hashing violation messages is fragile. Count-based matching is resilient to code formatting, reordering, and minor refactoring.

## Architecture

### Two Phases

```
Phase 1 (count-only):  file + rule → count
Phase 2 (with scope):  file + rule → count + scope selector
```

Phase 2 is additive — existing suppressions files without `scope` continue to work as file-level suppressions.

### Suppression File Format

```json
{
  "src/index.html": {
    "attr-duplication": { "count": 3, "scope": "#main-nav > ul" },
    "case-sensitive-attr-name": { "count": 1 }
  }
}
```

- **Keys:** Relative file paths (POSIX separators, relative to the suppressions file location)
- **`count`:** Number of error-severity violations to suppress
- **`scope`** (optional): CSS selector identifying the LCA subtree

### Module Structure

```
packages/markuplint/src/suppressions/
├── types.ts                 — SuppressionEntry, SuppressionsData
├── compute-scope.ts         — LCA computation, selector generation
├── generate-suppressions.ts — Build suppression data from violations
├── apply-suppressions.ts    — Filter violations using suppression data
├── merge-suppressions.ts    — Merge existing + new suppressions (max count)
├── prune-suppressions.ts    — Remove stale entries
├── suppressions-file.ts     — JSON file read/write, path utilities
└── index.ts                 — Barrel exports
```

### Data Flow

```
┌─────────────────────────────────────────────────┐
│  --suppress mode                                │
│                                                 │
│  violations ──→ generateSuppressions()          │
│  + nodeLists     ├─ computeScopeForViolations() │
│                  │   ├─ findNodeAtPosition()    │
│                  │   ├─ computeLCA()            │
│                  │   └─ generateUniqueSelector()│
│                  └─→ SuppressionsData           │
│                      ↓                          │
│                  mergeSuppressions()             │
│                      ↓                          │
│                  writeSuppressionsFile()         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Normal lint mode                               │
│                                                 │
│  violations ──→ applySuppressions()             │
│  + suppressions   ├─ getScopedErrorInfo()       │
│  + nodeLists      │   └─ isViolationInScope()   │
│                   │       └─ matchesScopeSelector│
│                   └─→ filtered violations       │
└─────────────────────────────────────────────────┘
```

## Selector Scope (LCA Algorithm)

### Concept

When all violations for a rule in a file occur within a specific subtree, compute the **Lowest Common Ancestor (LCA)** and generate a CSS selector for it. This narrows the suppression scope so that new violations in other parts of the file are detected.

### Algorithm

1. **Reverse-lookup:** Find each violation's DOM node using `line:col` → `nodeList` linear search
2. **Ancestor chains:** Collect the ancestor chain (parent → grandparent → ... → root) for each node
3. **LCA:** Walk chains from root, find the deepest node common to all chains
4. **Fallback:** If LCA is `body` or `html`, return `undefined` (file-level suppression)
5. **Selector generation:** Generate a minimal unique selector for the LCA node

### Selector Generation Strategy

Priority order (most unique first):

| Strategy | Example | When used |
|---|---|---|
| `#id` | `#main-nav` | Node has an `id` attribute |
| `tag.classA.classB` | `nav.global-nav.sticky` | Node has classes (all included) |
| `tag[attr="value"]` | `section[role="navigation"]`, `input[type="checkbox"]` | Node has a distinguishing attribute (`role` for any element, `type` for `<input>`) |
| Ancestor path with nth-of-type | `main > section:nth-of-type(2)` | No id, class, or distinguishing attribute; uses `:nth-of-type()` for same-tag siblings |
| Ancestor path stopping at id/class/attr | `#main > ul` | Ancestor has id, class, or distinguishing attribute |

### Scope Matching (Apply Side)

When applying suppressions, the scope selector is matched against violation nodes:

1. Find the violation's node via `line:col`
2. Walk up ancestors, checking each against the scope selector
3. Selector segments are matched right-to-left with `>` combinators
4. Supports: `#id`, `tag.classA.classB`, `tag:nth-of-type(n)`, `tag`

## Prior Art

| Tool | Language | Matching Strategy | Notes |
|---|---|---|---|
| **ESLint** | JS/TS | File + rule + count | Official, count-based |
| **@rushstack/eslint-bulk** | JS/TS | File + rule + scopeId (AST hierarchy) | TikTok, `.ClassName.methodName` |
| **PHPStan** | PHP | Message regex + count + path | Pioneer of baseline pattern |
| **detekt** | Kotlin | RuleID + finding signature | Code structure based |
| **RuboCop** | Ruby | Per-rule file exclusion list | Coarse-grained |
| **Stylelint** | CSS | File + rule + count | ESLint-compatible |
| **Ruff** | Python | Inline `# noqa` auto-insertion | Modifies source code |

markuplint's approach combines ESLint's count-based simplicity with @rushstack's scope-aware precision, using CSS selectors (a natural fit for an HTML linter) instead of AST scope identifiers.

## CLI Options

| Flag | Description |
|---|---|
| `--suppress` | Record all current error violations in the suppressions file |
| `--suppress-rule <rule>` | Record only violations for the specified rule |
| `--prune-suppressions` | Remove stale entries (fixed violations) from the suppressions file |
| `--suppressions-location <path>` | Custom path for the suppressions file (default: `markuplint-suppressions.json`) |

## Known Limitations

- **`--prune-suppressions` does not scope-filter:** It counts all file-level violations, not scope-filtered ones. Re-run `--suppress` for scope-accurate counts.
- **Performance:** `findNodeAtPosition` uses O(n) linear search per violation. Acceptable for typical file sizes but could be optimized with a position index for very large documents.
- **Template languages:** Vue/Svelte preprocessor blocks are handled transparently via `parentNode`, but the generated scope selector reflects the parsed DOM structure, which may differ from the source template.

## Future Considerations

- **Scope in `--prune-suppressions`:** Pass `nodeLists` to prune for scope-aware count comparison
- **Scope validation:** Warn when a scope selector no longer matches any node in the document
- **API support:** Expose suppressions via `MLEngine` API for programmatic use (currently CLI-only for generation)
- **File format versioning:** If a breaking format change is needed, introduce a `{ version: N, ... }` envelope
