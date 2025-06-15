# Maintenance Scripts

## update-rule-metadata.js

A utility script to update the static rule metadata in `config-to-markdown.ts` by reading the actual README.md and meta.ts files from `@markuplint/rules`.

This addresses the concern about hard-coded rule descriptions becoming stale when `@markuplint/rules` is updated.

### Usage

```bash
node scripts/update-rule-metadata.js
```

### What it does

1. Scans all rule directories in `@markuplint/rules/src`
2. Extracts description from each rule's README.md frontmatter
3. Extracts category from each rule's meta.ts file
4. Updates the BUILTIN_RULES object in config-to-markdown.ts

### When to run

- After updating `@markuplint/rules` package
- Before releasing a new version of the MCP server
- When rule descriptions change in the main project

This ensures the MCP server always has accurate rule descriptions without requiring runtime network access.