---
sidebar_position: 6
title: Rule Fix Function
---

# Rule Fix Function

:::tip Redesigned in v5
v4 had a `RuleSeed.fix()` hook and a working `--fix` CLI flag, but no built-in rule ever implemented it — running `--fix` in v4 was a no-op for every bundled rule. v5 replaces that whole-document hook with an inline, per-violation `fix` callback on `context.report()`, and now ships eleven built-in rules that use it. Existing rules that don't add a `fix` callback work without changes. This page explains how to add auto-fix to your custom rules.
:::

## Who is this for?

- Custom rule authors who want auto-fix capability
- Plugin developers maintaining third-party Markuplint rules

## Overview

v5 redesigns auto-fix around a system inspired by ESLint's fixer. Add a `fix` callback to `context.report()`. When the user runs Markuplint with `fix=true`, the callback produces edits that are applied to the source.

## Adding a fix callback

Add a `fix` property to your `report()` call. It receives an `IRuleFixer` and returns one or more `TextEdit` objects:

```typescript
context.report({
  scope: node,
  message: 'Tag name should be lowercase',
  fix: fixer => fixer.replaceText({ startOffset: nameOffset, raw: node.rawName }, node.rawName.toLowerCase()),
});
```

:::note
The `fix` callback is not executed during linting. It runs only when `fix=true` is passed to `MLCore.verify()`.
:::

## IRuleFixer API

The `IRuleFixer` interface provides six methods:

| Method                      | What it does                   |
| --------------------------- | ------------------------------ |
| `replaceText(token, text)`  | Replace a token's text         |
| `replaceRange(range, text)` | Replace a `[start, end)` range |
| `insertBefore(token, text)` | Insert text before a token     |
| `insertAfter(token, text)`  | Insert text after a token      |
| `remove(token)`             | Remove a token                 |
| `removeRange(range)`        | Remove a `[start, end)` range  |

### The `FixToken` type

Methods that accept a `token` use the `FixToken` type:

```typescript
type FixToken = {
  readonly startOffset: number;
  readonly raw: string;
};
```

All MLDOM tokens (`MLToken`, `MLAttr`, `nameNode`, `valueNode`, etc.) satisfy this type. You can also create tokens manually:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: 42, raw: 'old-text' },
  'new-text',
),
```

### Returning multiple edits

Return an array of `TextEdit` objects for atomic multi-edit fixes. If any edit in the group overlaps with another rule's fix, all edits in the group are skipped:

```typescript
fix: fixer =>
  [attr.spacesBeforeEqual, attr.equal, attr.valueNode]
    .filter((token): token is NonNullable<typeof token> => token != null)
    .map(token => fixer.remove(token)),
```

:::note
`spacesBeforeEqual`, `equal`, and `valueNode` are typed `MLToken | null` — `null` when the attribute has no value (e.g. a boolean attribute written bare). Filter them out before calling `fixer.remove()`, which requires a non-null token.
:::

## Examples

### Replace text

Convert a tag name to lowercase:

```typescript
fix: fixer => fixer.replaceText(
  { startOffset: nameOffset, raw: el.rawName },
  el.rawName.toLowerCase(),
),
```

### Remove a token

Remove an orphaned end tag:

```typescript
fix: fixer => fixer.remove(
  { startOffset: text.startOffset, raw: text.raw },
),
```

### Remove by range

Remove an entire attribute (from whitespace through closing quote):

```typescript
fix: fixer => fixer.removeRange([
  firstToken.startOffset,
  lastToken.startOffset + lastToken.raw.length,
]),
```

## Helper functions

`@markuplint/rules` provides shared helpers for common attribute removal patterns:

| Helper                         | What it does                                                 |
| ------------------------------ | ------------------------------------------------------------ |
| `removeAttr(fixer, attr)`      | Remove an entire attribute (name + value + whitespace)       |
| `removeAttrValue(fixer, attr)` | Remove only the value (equals, quotes, value), keep the name |

These handle null/empty tokens automatically.

## Multi-pass fix behavior

When multiple rules produce overlapping fixes, the engine resolves them:

1. Collect all fixes and apply in one pass
2. Skip overlapping fixes
3. Re-parse and re-run rules if any fixes were skipped
4. Repeat until no skipped fixes remain (up to 10 passes)

:::tip
Rule authors do not need to handle overlapping fixes. The engine manages this automatically.
:::

## Built-in rules with fix support

These built-in rules support auto-fix in v5:

| Rule                       | Fix behavior                               |
| -------------------------- | ------------------------------------------ |
| `case-sensitive-tag-name`  | Converts tag name to configured case       |
| `case-sensitive-attr-name` | Converts attribute name to configured case |
| `attr-value-quotes`        | Converts quotes to configured style        |
| `no-boolean-attr-value`    | Removes value from boolean attributes      |
| `no-default-value`         | Removes attribute with default value       |
| `no-duplicate-attr`        | Removes duplicate attribute                |
| `no-ineffective-attr`      | Removes ineffective attribute              |
| `no-orphaned-end-tag`      | Removes orphaned end tag                   |
| `no-consecutive-br`        | Removes consecutive `<br>` elements        |
| `attr-order`               | Reorders attributes to configured order    |
| `head-element-order`       | Reorders head child elements               |

## Type imports

```typescript
import type { IRuleFixer, TextEdit, FixToken } from '@markuplint/ml-config';
```

The `IRuleFixer` is passed to your callback. You do not need to instantiate it.
