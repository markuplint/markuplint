# Error Handling Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **Custom rule authors** who catch or throw error classes from markuplint packages
- **Custom parser authors** who throw `ParserError` or `ConfigParserError`
- **Plugin developers** who use `instanceof` checks on markuplint error classes
- **Node.js API users** who programmatically process lint results and inspect error types

If you only use markuplint via the CLI or editor extensions, **no action is required**.

## Summary of Changes

| Change | Impact | Action Required |
|--------|--------|-----------------|
| Error class definitions consolidated into `@markuplint/shared` | Internal — no user action | None |
| New `isFatalError()` guard function | Custom rule/plugin authors with `catch` blocks | Adopt in catch blocks (recommended) |
| `ConfigParserError` message format fix | Code that parses error messages | Update string matching if any |
| New `@markuplint/shared` dependency for `@markuplint/selector` | Users pinning exact versions | Update lockfile |

## Error Class Import Paths — No Change Required

Error class definitions have been consolidated into `@markuplint/shared` internally, but **your import paths do not need to change**. Each package continues to export its error classes as the public API.

Import error classes from the package that matches your use case:

```typescript
// ✅ Custom parser — import from parser-utils
import { ParserError, TargetParserError, ConfigParserError } from '@markuplint/parser-utils';
import type { ParserErrorInfo } from '@markuplint/parser-utils';

// ✅ Selector usage — import from selector
import { InvalidSelectorError } from '@markuplint/selector';

// ✅ Cross-cutting utilities (e.g., guard functions) — import from shared
import { isFatalError } from '@markuplint/shared';
```

### Import Guidelines

| Class | Recommended Import | Use Case |
|-------|-------------------|----------|
| `ParserError`, `TargetParserError`, `ConfigParserError`, `ParserErrorInfo` | `@markuplint/parser-utils` | Custom parsers, parser plugins |
| `InvalidSelectorError` | `@markuplint/selector` | Selector-related code |
| `isFatalError()` | `@markuplint/shared` | Any `catch` block that needs error classification |
| `ConfigLoadError`, `UnexpectedCallError` | `@markuplint/shared` | Internal / cross-cutting code only |

**Rule of thumb:** Import from the domain package you're working with. Use `@markuplint/shared` only for utilities like `isFatalError()` that don't belong to a specific domain, or for error classes that have no domain-specific package (e.g., `ConfigLoadError`).

## New: `isFatalError()` Guard Function

A new guard function `isFatalError()` is exported from `@markuplint/shared`. It classifies errors according to the [three-tier error handling policy](../architectures/ERROR-HANDLING.md).

### What It Does

Returns `true` for errors that indicate implementation bugs or broken invariants (Tier 1 — Fatal):

- `TypeError`, `ReferenceError`, `RangeError`, `SyntaxError`
- `UnexpectedCallError`
- Non-`Error` throws (strings, `null`, `undefined`, etc.)

Returns `false` for recoverable errors (Tier 2/3):

- `ParserError`, `TargetParserError`, `ConfigParserError`
- `ConfigLoadError`, `InvalidSelectorError`
- Generic `Error`

### Before (v4)

```typescript
// Custom rule or plugin code
try {
  // ... some operation
} catch (error) {
  if (error instanceof TypeError || error instanceof ReferenceError) {
    throw error;
  }
  // handle recoverable error
}
```

### After (v5)

```typescript
import { isFatalError } from '@markuplint/shared';

try {
  // ... some operation
} catch (error) {
  if (isFatalError(error)) {
    throw error;
  }
  // handle recoverable error
}
```

### Migration

This is **additive** — no existing code breaks. Adopting `isFatalError()` is recommended for any `catch` block in custom rules or plugins to ensure fatal errors are never swallowed.

## `ConfigParserError` Message Format Fix

A bug in `ConfigParserError` has been fixed. The constructor's position check was comparing `info.line` against itself instead of checking `info.col`.

### Before (v4 — buggy)

```typescript
// Bug: info.line was checked twice, info.col was never checked
const pos = info.line != null && info.line != null ? `(${info.line}:${info.col})` : '';
// Result: position was ALWAYS included when line was set, even if col was undefined
// e.g. "error in /config.json(2:undefined)"
```

### After (v5 — fixed)

```typescript
const pos = info.line != null && info.col != null ? `(${info.line}:${info.col})` : '';
// Result: position is only included when BOTH line and col are set
// e.g. "error in /config.json(2:5)" or "error in /config.json"
```

### Impact

If your code parses `ConfigParserError.message` strings (e.g., via regex), the output may change when `col` is `undefined`:

| `info` | v4 message | v5 message |
|--------|-----------|-----------|
| `{ line: 2, col: 5, filePath: '/a.json' }` | `"msg in /a.json(2:5)"` | `"msg in /a.json(2:5)"` (unchanged) |
| `{ line: 2, filePath: '/a.json' }` | `"msg in /a.json(2:undefined)"` | `"msg in /a.json"` |
| `{ filePath: '/a.json' }` | `"msg in /a.json"` | `"msg in /a.json"` (unchanged) |

### Migration

If you match error messages with regex patterns that expect `(line:col)` to always be present, update them to handle the case where position is omitted.

## New Dependency: `@markuplint/selector` → `@markuplint/shared`

`@markuplint/selector` now depends on `@markuplint/shared` (version `5.0.0-rc.0`). This is because `InvalidSelectorError` is now defined in `@markuplint/shared` and re-exported from `@markuplint/selector`.

### Impact

- If you use `@markuplint/selector` standalone, `@markuplint/shared` will be installed as a transitive dependency
- No API changes — `InvalidSelectorError` is still available from `@markuplint/selector`

### Migration

Run `npm install` / `yarn install` to update your lockfile. No code changes required.

## Error Class Hierarchy (Reference)

For custom rule and parser authors, here is the complete error class hierarchy in v5:

```
Error (built-in)
├── ParserError                    — Tier 3: User's source code is malformed
│   ├── TargetParserError          — Tier 3: Element-specific parse error
│   └── ConfigParserError          — Tier 3: Config file syntax error
├── ConfigLoadError                — Tier 2: Config file cannot be loaded
├── InvalidSelectorError           — Tier 3: CSS selector syntax error in config
└── UnexpectedCallError            — Tier 1: Internal API contract violation
```

For the full error handling policy including tier definitions and flow diagrams, see [Error Handling Policy](../architectures/ERROR-HANDLING.md).
