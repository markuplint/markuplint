---
description: Create and maintain framework parser and spec packages for markuplint
metadata:
  internal: true
globs:
  - packages/@markuplint/*-parser/src/**
  - packages/@markuplint/*-spec/src/**
alwaysApply: false
---

# framework-parsers-maintenance

Create and maintain framework parser and spec packages for markuplint.

## Architecture

The parser hierarchy, extension points, and design rationale are documented in the `Parser` class JSDoc in `packages/@markuplint/parser-utils/src/parser.ts`. Read it before extending. For concrete patterns, read an existing sibling package (template engine: `ejs-parser`; full framework: `astro-parser`; spec: `react-spec`) — new packages follow the sibling's structure.

## Package types and naming

- `@markuplint/<lang>-parser` — parser package. Two kinds:
  - **Template engine parsers** extend `HtmlParser` and configure only `ignoreTags`.
  - **Full framework parsers** extend `Parser` and implement `tokenize()`, `nodeize()`, `visitAttr()`, `detectElementType()`, delegating tokenization to the framework's own parser library.
- `@markuplint/<lang>-spec` — spec package exporting an `ExtendedSpec` object (global attributes + per-element overrides).

## Rules (constraints — violations break the build or runtime contracts)

1. **Template parsers must only configure `ignoreTags`** — never override `tokenize()` or `nodeize()`.
2. **Full parsers must delegate tokenization to an external parser library** — never implement framework parsing from scratch.
3. **Spec packages must only export an `ExtendedSpec` object** — no parsing logic.
4. **Use `potentialName` for attribute mapping** — it tells markuplint which standard HTML attribute a framework attribute corresponds to.
5. **Test with `nodeListToDebugMaps`** — the standard assertion pattern across all parsers.
6. **Full framework parsers must ship a `component-scanner` subpath export** (`"./component-scanner"` in `package.json` `exports`) — `@markuplint/pretenders` dynamically imports it at runtime for auto scan. Without it, the framework's components are not detected.
7. **Never import from `@markuplint/pretenders` inside component-scanner** — define local types structurally compatible with its `ComponentScanner` interface. Importing pretenders creates a circular dependency in the lerna build graph.
