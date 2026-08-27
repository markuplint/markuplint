---
sidebar_position: 6
title: 'Rule Fix Function'
---

# Rule fix function

v4 had `RuleSeed.fix()` and a `--fix` flag; **no bundled rule implemented it**, so `--fix` did nothing for built-in rules. v5 uses a per-violation `fix` callback on `report()`. Rules without `fix` are unchanged.

```ts
context.report({
  scope: node,
  message: 'Tag name should be lowercase',
  fix: fixer => fixer.replaceText({ startOffset: nameOffset, raw: node.rawName }, node.rawName.toLowerCase()),
});
```

The callback runs only when `fix=true` is passed to verification (CLI `--fix`).

`IRuleFixer`: `replaceText`, `replaceRange`, `insertBefore`, `insertAfter`, `remove`, `removeRange`. Token shape is `{ startOffset, raw }`. Return an array of `TextEdit` for atomic multi-edits (overlap skips the whole group).

Helpers in `@markuplint/rules`: `removeAttr`, `removeAttrValue`.

Overlapping fixes: apply a pass, skip overlaps, re-parse, repeat (cap 10).

Built-in rules with `fix` in v5: `case-sensitive-tag-name`, `case-sensitive-attr-name`, `attr-value-quotes`, `no-boolean-attr-value`, `no-default-value`, `no-duplicate-attr`, `no-ineffective-attr`, `no-orphaned-end-tag`, `no-consecutive-br`, `attr-order`, `head-element-order`.

Types: `IRuleFixer`, `TextEdit`, `FixToken` from `@markuplint/ml-config`.
