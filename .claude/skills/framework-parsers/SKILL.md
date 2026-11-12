---
name: framework-parsers
metadata:
  internal: true
description: >
  Create and maintain framework parser and spec packages for markuplint —
  package types, naming, and the architectural constraints that break the
  build or runtime contracts when violated. Use when adding or modifying any
  @markuplint/*-parser or @markuplint/*-spec package. Trigger keywords: new
  parser, template engine parser, framework parser, spec package,
  ExtendedSpec, ignoreTags, component-scanner.
---

# framework-parsers

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
6. **Parsers for formats that define components in the template file (vue, svelte, astro) must ship a `component-scanner` subpath export** (`"./component-scanner"` in `package.json` `exports`) — `@markuplint/pretenders` dynamically imports it at runtime for auto scan. Without it, the framework's components are not detected. `jsx-parser` and `pug-parser` ship none: their components are not declared in the template file.
7. **Never import from `@markuplint/pretenders` inside component-scanner** — define local types structurally compatible with its `ComponentScanner` interface. Importing pretenders creates a circular dependency in the lerna build graph.
8. **Markup that the framework's compiler rejects or removes, but that the parser can still read, is a non-fatal parse error, not a thrown `ParserError`** — return `parseErrors` from `tokenize()` with a code of `MLASTFrameworkParseErrorCode` (`@markuplint/ml-ast`), and list the code in the `parse-error` page of the migration guide (both languages). The channel is off until the user sets `severity.parseError`, and a thrown error stops every rule for the file. `parse-error-code-sync.spec.ts` compares only parse5's codes, so a framework code is not covered by it.
9. **Where an element is output is the framework's, so the spec says it, not the parser** — an element that the framework moves elsewhere (`movedToHead` of `ExtendedSpec`) is declared in the `-spec` package. A parser shared by several frameworks (`jsx-parser` serves React, SolidJS and Qwik) must not turn it into a PSBlock, which would hide it from every framework that outputs it where it is written. A parser may make a block of an element that its own framework's compiler removes whatever the spec (Vue's `<style>` and `<script>` in a template).
10. **A parser for a framework whose `<slot>` is the placeholder of a component declares `slotElement: 'framework'`** (`MLParser#slotElement` of `@markuplint/ml-ast`: vue, svelte and astro do). Without it `@markuplint/ml-core` reads the `slot` in a declarative shadow root (`<template shadowrootmode>`) of the file as the HTML `slot` element and computes which nodes it takes, so the rules report on what the framework renders differently. It is the parser that says it, not a `-spec` package: a file is read by its parser whatever the configuration `specs` is, and astro has no spec package. A parser shared by several frameworks (`jsx-parser`) or a template engine's does not declare it.
