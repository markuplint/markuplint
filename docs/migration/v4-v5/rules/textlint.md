# `@markuplint/rule-textlint` Removed: v4 to v5 Migration Guide

## Who This Guide Is For

- **Users** who had `@markuplint/rule-textlint` installed and configured the `textlint` rule in their markuplint config

## Summary of Changes

| Change | Impact |
|--------|--------|
| `@markuplint/rule-textlint` package removed | Users relying on the `textlint` rule for text linting within markuplint |

## Package Removed

`@markuplint/rule-textlint` has been fully deprecated and removed from the markuplint ecosystem.

### Why

- **`@markuplint/markdown-parser`** has been created, allowing markuplint to lint Markdown files directly.
- **textlint** already provides [`textlint-plugin-html`](https://github.com/textlint/textlint-plugin-html) for linting text content inside HTML.
- Tight integration between the two tools is no longer necessary — each tool can handle its domain independently.

### Migration

1. **Remove** `@markuplint/rule-textlint` from your dependencies.
2. **Remove** the `textlint` rule from your markuplint config.
3. **Use textlint standalone** with `textlint-plugin-html` for text linting in HTML files.
4. For Markdown linting with markuplint, use `@markuplint/markdown-parser`.
