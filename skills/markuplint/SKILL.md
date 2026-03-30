---
name: markuplint
description: Reference knowledge for Markuplint HTML linter. Covers violation interpretation, CLI usage, config patterns, and documentation URLs. Auto-loaded when working with HTML linting.
---

# Markuplint

Reference knowledge for working with Markuplint.

## What is Markuplint

An HTML linter that checks conformance with HTML Standard, WAI-ARIA, and project-specific rules. Supports JSX, Vue, Svelte, Astro, Pug, PHP, and more via parser plugins.

- Official site: https://markuplint.dev
- GitHub: https://github.com/markuplint/markuplint
- Playground: https://playground.markuplint.dev

## Reading Violation Messages

Format: `message (ruleId) [named-rule]`

```
The attribute name is duplicated (attr-duplication) [html-standard/attr-duplication]
```

- **`ruleId`** (`attr-duplication`) — the base rule. Always present.
- **`named-rule`** (`html-standard/attr-duplication`) — preset-defined alias. Present only for named rules. The `namespace/` prefix indicates which preset defined it (e.g., `a11y/`, `html-standard/`, `performance/`).
- **`severity`** — `error` (exit code 1), `warning` (exit code 0 by default), or `info`.

To look up any rule: `https://markuplint.dev/docs/rules/{ruleId}`

## CLI Quick Reference

```shell
# Basic lint
npx markuplint "src/**/*.html"

# JSON output (for programmatic use)
npx markuplint "src/**/*.html" --format JSON

# Auto-fix (rules that support it)
npx markuplint "src/**/*.html" --fix

# Preview fixes without writing
npx markuplint "src/**/*.html" --fix-dry-run

# Suppress current violations for gradual adoption
npx markuplint "src/**/*.html" --suppress

# Clean up fixed suppressions
npx markuplint "src/**/*.html" --prune-suppressions

# GitHub Actions annotations
npx markuplint "src/**/*.html" --format GitHub

# Limit output for large projects
npx markuplint "src/**/*.html" --max-count=50
```

Always quote glob patterns to prevent shell expansion.

## Config Patterns

### Disable a named rule

```json
{ "rules": { "a11y/html-lang": false } }
```

### Disable all rules in a namespace

```json
{ "rules": { "a11y/*": false } }
```

### Change severity

```json
{ "rules": { "a11y/html-lang": "warning" } }
```

### Element-specific rules

`nodeRules` — targets the matched element. `childNodeRules` — targets descendants (add `"inheritance": true` for all descendants, not just direct children).

### Ancestor matching

Use `:is(selector *)`. Do NOT use `:closest()` — it is deprecated.

```json
{ "selector": "div:is(nav *)" }
```

## Common Issues and Fixes

### OGP / Open Graph `property` attribute

The `property` attribute is not in the HTML spec. See: https://markuplint.dev/docs/rules/invalid-attr#the-open-graph-protocol

### `invalid-attr` with frameworks

Install the framework's spec plugin (e.g., `@markuplint/react-spec`). See: https://markuplint.dev/docs/guides/beyond-html#why-need-the-spec-plugins

### `character-reference` false positives with template engines

Some template syntaxes trigger false positives. Disable partially or report: https://markuplint.dev/docs/rules/character-reference

### `--init` is interactive only

`npx markuplint --init` requires terminal input. AI agents should write `.markuplintrc` directly.

## Documentation URLs

| Topic | URL |
| --- | --- |
| All rules | `https://markuplint.dev/docs/rules` |
| Specific rule | `https://markuplint.dev/docs/rules/{rule-id}` |
| Presets | `https://markuplint.dev/docs/guides/presets` |
| Framework setup | `https://markuplint.dev/docs/guides/beyond-html` |
| Config properties | `https://markuplint.dev/docs/configuration/properties` |
| Selectors | `https://markuplint.dev/docs/guides/selectors` |
| CLI options | `https://markuplint.dev/docs/guides/cli` |
| FAQ | `https://markuplint.dev/docs/guides/faq` |
| Migration (v4→v5) | `https://markuplint.dev/docs/migration/v4-to-v5` |

Use `WebFetch` on these URLs when you need current details.
