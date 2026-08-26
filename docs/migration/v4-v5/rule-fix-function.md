# Rule Fix Function: v4 to v5 Migration Guide

## Who This Guide Is For

- **Custom rule authors** who want to add auto-fix capability to their rules
- **Plugin developers** who maintain third-party markuplint rules

> This is a **new feature** in v5 — there is no v4 equivalent. Existing rules continue to work without changes. This guide explains how to opt into the new fix API.

## Overview

v5 introduces an auto-fix system inspired by ESLint's `SourceCodeFixer`. Rules can now provide a `fix` callback on `report()` calls. When the user runs markuplint with `fix=true`, these callbacks produce `TextEdit` objects that are applied to the source code.

## Adding a Fix Callback

### Basic Usage

Add a `fix` property to your `report()` call. The callback receives an `IRuleFixer` instance and returns one or more `TextEdit` objects:

```typescript
context.report({
  scope: node,
  message: 'Tag name should be lowercase',
  fix: fixer => fixer.replaceText(
    { startOffset: nameOffset, raw: node.rawName },
    node.rawName.toLowerCase(),
  ),
});
```

The `fix` callback is **not** executed during verification — it is stored and only invoked when `fix=true` is passed to `MLCore.verify()`.

## IRuleFixer API

The `IRuleFixer` interface (from `@markuplint/ml-config`) provides six methods:

| Method | Description |
|--------|-------------|
| `replaceText(token, text)` | Replace a token's text with new content |
| `replaceRange(range, text)` | Replace an explicit `[start, end)` range |
| `insertBefore(token, text)` | Insert text before a token |
| `insertAfter(token, text)` | Insert text after a token |
| `remove(token)` | Remove a token entirely |
| `removeRange(range)` | Remove an explicit `[start, end)` range |

### Token Parameter

Methods that accept a `token` parameter require an object satisfying the `FixToken` type:

```typescript
type FixToken = {
  readonly startOffset: number;
  readonly raw: string;
};
```

All MLDOM tokens (`MLToken`, `MLAttr`, attribute sub-tokens like `nameNode`, `valueNode`, etc.) satisfy this interface. You can also construct ad-hoc tokens:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: 42, raw: 'old-text' },
  'new-text',
),
```

### Returning Multiple Edits

A fix callback can return a single `TextEdit` or an array of `TextEdit` objects. Multiple edits within a single callback are applied atomically — if any edit overlaps with another rule's fix, all edits in the group are skipped:

```typescript
fix: fixer => [
  fixer.remove(attr.spacesBeforeEqual),
  fixer.remove(attr.equal),
  fixer.remove(attr.valueNode),
],
```

## Examples

### Replace Text

Convert a tag name to lowercase:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: nameOffset, raw: el.rawName },
  el.rawName.toLowerCase(),
),
```

### Remove a Token

Remove an orphaned end tag:

```typescript
fix: fixer => fixer.remove(
  { startOffset: text.startOffset, raw: text.raw },
),
```

### Remove by Range

Remove an entire attribute (from leading whitespace through the closing quote):

```typescript
fix: fixer => fixer.removeRange([
  firstToken.startOffset,
  lastToken.startOffset + lastToken.raw.length,
]),
```

## Helper Functions for Rule Authors

`@markuplint/rules` provides shared helpers in `src/helpers.ts` for common attribute removal patterns:

| Helper | Description |
|--------|-------------|
| `removeAttr(fixer, attr)` | Remove an entire attribute (name + value + surrounding whitespace) |
| `removeAttrValue(fixer, attr)` | Remove only the value portion (equals, quotes, value), keeping the name |

These accept the standard attribute token properties (`spacesBeforeName`, `nameNode`, `equal`, `valueNode`, etc.) and handle null/empty tokens automatically.

## Multi-Pass Fix Behavior

When multiple rules produce overlapping fixes, the engine applies them iteratively:

1. All fixes are collected and applied in a single pass
2. Overlapping fixes are skipped
3. If any fixes were skipped, the source is re-parsed and rules are re-run
4. This repeats until no more skipped fixes remain (up to 10 passes)

**Rule authors do not need to handle this** — the engine manages overlap resolution transparently.

## Built-in Rules with Fix Support

The following built-in rules support auto-fix in v5:

| Rule | Fix behavior |
|------|-------------|
| `case-sensitive-tag-name` | Converts tag name to configured case |
| `case-sensitive-attr-name` | Converts attribute name to configured case |
| `attr-value-quotes` | Converts attribute quotes to configured style |
| `no-boolean-attr-value` | Removes value from boolean attributes |
| `no-default-value` | Removes attribute with default value |
| `no-duplicate-attr` | Removes duplicate attribute |
| `no-ineffective-attr` | Removes ineffective attribute |
| `no-orphaned-end-tag` | Removes orphaned end tag |
| `no-consecutive-br` | Removes consecutive `<br>` elements |

## Type Imports

```typescript
import type { IRuleFixer, TextEdit, FixToken } from '@markuplint/ml-config';
```

These types are re-exported from `@markuplint/ml-config`. The `IRuleFixer` is passed to your callback — you do not need to instantiate it.
