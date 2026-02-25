---
sidebar_position: 4
title: textlint
---

# `@markuplint/rule-textlint` Removed

The `@markuplint/rule-textlint` package has been completely removed from the Markuplint ecosystem.

## Summary

| Change                                      | Who is affected                                            |
| ------------------------------------------- | ---------------------------------------------------------- |
| `@markuplint/rule-textlint` package removed | Users who had the `textlint` rule configured in Markuplint |

## Why it was removed

- **Markuplint now supports Markdown** via `@markuplint/markdown-parser`.
- **textlint** already provides [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) for linting text content inside HTML files.
- Tight integration between the two tools is no longer necessary. Each tool handles its domain independently.

## How to migrate

### Step 1: Uninstall the package

```bash
npm uninstall @markuplint/rule-textlint
```

### Step 2: Remove the rule from your config

Delete the `textlint` entry from your Markuplint configuration file:

```json
{
  "rules": {
    // Remove this line:
    "textlint": { ... }
  }
}
```

### Step 3: Use alternatives

:::tip Alternatives

- **For text linting in HTML**: Use [textlint](https://textlint.github.io/) with [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) as a standalone tool.
- **For Markdown linting with Markuplint**: Use `@markuplint/markdown-parser` to lint your Markdown files directly.
  :::
