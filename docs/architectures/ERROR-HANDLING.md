# Error Handling Policy

This document defines markuplint's error classification and handling strategy.
Every error that can occur at runtime falls into one of three tiers.
Each tier specifies **who is responsible**, **what happens**, and **how the error surfaces to the user**.

## Three-Tier Classification

```
Tier 1: Fatal ──────── Process terminates immediately (exit 2)
Tier 2: Per-File ───── That file is skipped; other files continue
Tier 3: Violation ──── Converted to a Violation and included in lint results
```

### Tier 1 — Fatal (Process Termination)

**Criteria:** markuplint's own invariants are broken. Continuing execution cannot produce trustworthy results.

| Error | Origin | Reason |
|-------|--------|--------|
| `TypeError` | Any layer | Implementation bug — null/undefined access, wrong types |
| `ReferenceError` | Any layer | Implementation bug — undefined variable |
| `UnexpectedCallError` | MLDOM | Internal API contract violation |
| `RangeError` / `SyntaxError` (from markuplint code) | Any layer | Implementation bug |
| Non-`Error` throw (e.g. `throw "string"`) | Any layer | Unknown failure, cannot reason about safety |
| `resolveFiles()` failure | CLI | Input premise broken — no files to lint |

**Behavior:**

1. Print a full stack trace to stderr
2. Exit with code `2` (distinct from lint-error exit code `1`)
3. Never catch, convert, or silence these errors

**Implementation rule:** Every `catch` block that handles `Error` must guard
against Tier 1 errors before any generic error handling. Use `isFatalError()`
from `@markuplint/shared`:

```typescript
import { isFatalError } from '@markuplint/shared';

// Pattern — guard against swallowing fatal errors
catch (error) {
    if (isFatalError(error)) {
        throw error;
    }
    // ... handle recoverable error
}
```

### Tier 2 — Per-File Recoverable (Skip File, Continue Others)

**Criteria:** A specific file's processing failed, but other files are unaffected. The failure is environmental or configuration-scoped, not a markuplint bug.

| Error | Origin | Reason |
|-------|--------|--------|
| `ConfigLoadError` | file-resolver | Config file for this target cannot be read |
| `CircularReferenceError` | config-provider | Circular `extends` in config chain |
| Parser module import failure | file-resolver / general-import | e.g. `@markuplint/vue-parser` not installed |
| File I/O error (`ENOENT`, `EACCES`) | fs | Permission denied, file deleted mid-run |
| Unexpected rule error (non-Tier-1) | ml-core → rule.verify() | A rule threw an error that is not a ParserError and not a programmer error |

**Behavior:**

1. Emit a `lint-error` event with the file path and error
2. Return a single `Violation` with `severity: 'error'` and `ruleId: 'system-error'` for that file
3. Log the error details to the debug logger
4. Continue processing the next file

**Implementation rule:** `MLEngine.exec()` is the boundary. It catches Tier 2 errors,
converts them to a result with a single violation, and returns normally.
Fatal errors (Tier 1) must pass through uncaught.

```typescript
// MLEngine.exec()
catch (error) {
    // Let fatal errors propagate
    if (isFatalError(error)) {
        throw error;
    }
    if (error instanceof Error) {
        this.emit('lint-error', filePath, sourceCode, error);
        return { violations: [{ severity: 'error', ruleId: 'system-error', ... }], ... };
    }
    // Non-Error throw → treat as fatal (already handled by isFatalError above)
    throw error;
}
```

### Tier 3 — Violation (User-Actionable, Merged into Results)

**Criteria:** The error originates from the user's source code or configuration. The user can fix it. markuplint is working correctly.

| Error | Severity | `ruleId` |
|-------|----------|----------|
| `ParserError` (HTML syntax error) | Configurable via `severity.parseError` | `parse-error` |
| `TargetParserError` (element-level syntax error) | Same as above | `parse-error` |
| `ConfigParserError` (`.markuplintrc` syntax error) | `warning` | `config-error` |
| `InvalidSelectorError` → `ConfigParserError` | `warning` | `config-error` |
| Undefined rule name in config | `warning` | `config-error` |
| `ParserError` thrown during rule execution | Configurable via `severity.parseError` | `parse-error` |
| accname computation operational error | *(not a violation — returns empty string)* | — |

**Behavior:**

1. Convert the error to a `Violation` object with appropriate severity and ruleId
2. Include it in the file's violation array alongside rule violations
3. The user sees it in the same output as other lint results

**Implementation rule:** `MLCore.verify()` is the boundary. It converts parse errors
and config errors to violations. The caller (`MLEngine`) receives a normal
`VerifyResult` containing these violations.

## Error Flow Diagram

```
Source code / Config / Modules
        │
        ▼
┌─────────────────────────────────────┐
│  Parser / Config / Import Layer     │
│                                     │
│  ParserError ──────────────┐        │
│  ConfigLoadError ──────────┤        │
│  ConfigParserError ────────┤        │
│  TypeError ────────────────┤        │
│  Other Error ──────────────┘        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  MLCore (#parse, #createDocument,   │
│          #runAllRules, verify)       │
│                                     │
│  ParserError  → Violation (Tier 3)  │
│  ConfigError  → Violation (Tier 3)  │
│  TypeError    → re-throw  (Tier 1)  │
│  Other Error  → re-throw  (Tier 2)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  MLEngine (exec)                    │
│                                     │
│  VerifyResult → return as-is        │
│  TypeError    → re-throw  (Tier 1)  │
│  Other Error  → lint-error event    │
│                 + system-error      │
│                   violation (Tier 2)│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  CLI (command, index.ts)            │
│                                     │
│  Result      → output + exit 0/1   │
│  Tier 1      → stderr + exit 2     │
└─────────────────────────────────────┘
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Lint completed, no errors (warnings allowed if `--allow-warnings`) |
| `1` | Lint completed, violations with severity `error` found |
| `2` | Fatal error — markuplint itself failed |

## Special Cases

### accname computation errors

Accessible name computation (`accname.ts`) may fail due to malformed DOM states
or incomplete spec data. These are **not** converted to violations because:

- A single element's accname failure should not create noise in unrelated rules
- The accname result (empty string = "unnamed") still produces meaningful a11y rule violations downstream

**All** errors (including `TypeError`) are caught, logged via the `debug` logger,
and return an empty name. This is an intentional exception to the Tier 1 re-throw
policy because accname failures can be caused by runtime environment differences
(e.g., Deno lacking certain DOM APIs), not only by implementation bugs.

### generalImport() failures

Module import failures in `generalImport()` return `null` instead of throwing.
This is an intentional exception to the Tier 1 rethrow policy: `await import()`
and `require()` invoke third-party module code, so a TypeError / SyntaxError
at this boundary may originate from the imported module rather than from
markuplint's own code, and the two cannot be distinguished. The Tier 1
SyntaxError row above is qualified as "from markuplint code" precisely to
allow this case. `generalImport()` therefore swallows every error and
returns `null`; callers (config / parser / plugin loaders) decide how to
surface the missing module.

The caller is responsible for deciding whether a missing module is:

- **Tier 2** (parser not installed → skip that file type)
- **Tier 3** (missing spec → proceed with base spec, warn via config-error)

### Console output consistency

All error output to the terminal must use `process.stderr.write()`.
Never use `console.warn()`, `console.error()`, or `console.log()` for error reporting in the CLI layer.

## Error Class Management

All custom error classes and tier-guard utilities live in **`@markuplint/shared`**.
Other packages import error classes from `@markuplint/shared` rather than defining
their own.

### Package layout

```
@markuplint/shared/src/
├── errors/
│   ├── index.ts                  -- Re-exports all error classes and guards
│   ├── parser-error.ts           -- ParserError, TargetParserError, ConfigParserError
│   ├── config-error.ts           -- ConfigLoadError
│   ├── selector-error.ts         -- InvalidSelectorError
│   ├── unexpected-call-error.ts  -- UnexpectedCallError
│   └── guards.ts                 -- isFatalError()
├── functions.ts                  -- (existing)
├── types.ts                      -- (existing)
└── index.ts                      -- Re-exports errors/, functions, types
```

### Error class hierarchy

```
Error (built-in)
├── ParserError                    -- Tier 3: User's source code is malformed
│   ├── TargetParserError          -- Tier 3: Element-specific parse error
│   └── ConfigParserError          -- Tier 3: Config file syntax error
├── ConfigLoadError                -- Tier 2: Config file cannot be loaded
├── InvalidSelectorError           -- Tier 3: CSS selector syntax error in config
└── UnexpectedCallError            -- Tier 1: Internal API contract violation
```

### Guard functions

```typescript
// @markuplint/shared/src/errors/guards.ts

/**
 * Returns true if the error is a Tier 1 (Fatal) error that must
 * never be caught or converted. These indicate implementation bugs
 * or broken invariants.
 */
export function isFatalError(error: unknown): boolean {
    return (
        error instanceof TypeError ||
        error instanceof ReferenceError ||
        error instanceof RangeError ||
        error instanceof SyntaxError ||
        error instanceof UnexpectedCallError ||
        !(error instanceof Error)
    );
}
```

### Where definitions live vs. where to import from

Error classes are **defined** in `@markuplint/shared`. Some are **re-exported** from
domain-specific packages for external consumers. Import from the domain package
when one exists, or from `@markuplint/shared` for cross-cutting utilities.

| Class | Defined in | Public API (import from) |
|-------|-----------|-------------------------|
| `ParserError`, `TargetParserError`, `ConfigParserError` | `@markuplint/shared` | `@markuplint/parser-utils` |
| `InvalidSelectorError` | `@markuplint/shared` | `@markuplint/selector` |
| `ConfigLoadError` | `@markuplint/shared` | `@markuplint/shared` (no domain package) |
| `UnexpectedCallError` | `@markuplint/shared` | `@markuplint/shared` (internal use) |
| `isFatalError()` | `@markuplint/shared` | `@markuplint/shared` |

Package-local error classes that are **not** part of the tier classification remain
in their original package:

| Class | Package | Reason |
|-------|---------|--------|
| `CircularReferenceError` | `@markuplint/file-resolver` (unexported) | Internal implementation detail |
| `UnsupportedError` | `@markuplint/rules` (internal) | Domain-specific, no cross-package use |
| `CreateRuleHelperError` | `@markuplint/create-rule` (internal) | CLI tool, no cross-package use |
| `HelpRequested`, `UsageHintError` | `@markuplint/create-rule` (unexported) | CLI flow control, not real errors |

### Why `@markuplint/shared`?

- **Already widely depended on** — most packages already have `@markuplint/shared`
  as a dependency, so no new dependency edges are introduced.
- **No new package overhead** — avoids the cost of creating, publishing, and
  maintaining a dedicated `@markuplint/errors` package.
- **Natural location for cross-cutting utilities** — guard functions like
  `isFatalError()` belong alongside other shared utilities.

## Checklist for New Code

When writing a `catch` block anywhere in markuplint:

1. **Guard Tier 1 first.** Use `isFatalError()` from `@markuplint/shared` to re-throw fatal errors before doing anything else.
2. **Identify the tier.** Is this error caused by the user (Tier 3), by the environment/file (Tier 2), or by markuplint itself (Tier 1)?
3. **Convert at the right boundary.** Tier 3 → `Violation` in `MLCore`. Tier 2 → `system-error` violation in `MLEngine`. Tier 1 → never catch.
4. **Log for debugging.** Use the `debug` logger so errors are traceable when `DEBUG=*` is set.
5. **Never silently swallow.** Every `catch` must either re-throw, convert to a visible result, or log. Empty `catch {}` blocks are prohibited.
