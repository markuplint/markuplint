# Framework Parser Breaking Changes: v4 to v5 Migration Guide

## Who This Guide Is For

- **htmx users** who configured `@markuplint/htmx-parser` in their markuplint config
- **Alpine.js users** who configured `@markuplint/alpine-parser` in their markuplint config
- **Spec package authors** who want to understand the new `directivePatterns` system

## Summary of Changes

| Change | Impact |
|--------|--------|
| `@markuplint/htmx-parser` deleted | htmx users must switch to `@markuplint/htmx-spec` (spec-only) |
| `@markuplint/alpine-parser` simplified | Alpine.js users must install `@markuplint/alpine-spec` for attribute resolution |
| `@markuplint/alpine-parser/spec` removed | Alpine.js users must switch spec entry to `@markuplint/alpine-spec` |
| New `directivePatterns` system in spec packages | Spec authors can declare attribute pattern resolution without writing a parser |

## htmx: Parser Removed, Spec-Only Package Added

htmx no longer requires a dedicated parser. The new `@markuplint/htmx-spec` package handles all htmx attribute resolution (such as `hx-on:click` to `onclick`) through the `directivePatterns` system, which runs at the spec level rather than the parser level.

### Before (v4)

Install the parser package:

```bash
npm install @markuplint/htmx-parser
```

Configure both `parser` and `specs`:

```json
{
  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
}
```

### After (v5)

Uninstall the old package and install the new spec package:

```bash
npm uninstall @markuplint/htmx-parser
npm install @markuplint/htmx-spec
```

Configure only `specs` -- no parser is needed:

```json
{
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
}
```

### Why This Changed

htmx support in v4 required a full parser package solely to resolve directive attributes (like `hx-on:click` to `onclick`). This was an architectural mismatch -- parsers should handle syntax and structure, not attribute semantics. The new `directivePatterns` system in v5 allows spec packages to declare attribute resolution rules declaratively, eliminating the need for a parser entirely.

## Alpine.js: Parser Simplified, Separate Spec Package Added

The Alpine.js parser has been stripped down to handle only `<template x-for>` loop iteration (converting it to a `PSBlock`). All attribute resolution (such as `x-bind:href` to `href`, `@click` to `onclick`, `:class` to `class`) has been moved to the new `@markuplint/alpine-spec` package via the `directivePatterns` system.

### Before (v4)

Install the parser package (which also bundled the spec):

```bash
npm install @markuplint/alpine-parser
```

Configure both `parser` and `specs`, referencing the parser package for both:

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
}
```

### After (v5)

Install both the simplified parser and the new spec package:

```bash
npm install @markuplint/alpine-parser @markuplint/alpine-spec
```

Configure `parser` and `specs` as separate packages:

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-spec" }
}
```

> **Note:** The parser is still required for Alpine.js because `<template x-for>` creates a loop iteration structure that requires AST-level handling (PSBlock conversion). The spec package alone cannot represent this.

### Why This Changed

In v4, the Alpine.js parser mixed two concerns: structural parsing (`<template x-for>` loops) and attribute resolution (`x-bind:`, `@`, `:` shorthands). In v5, attribute resolution is handled declaratively by the spec package through `directivePatterns`, and the parser focuses exclusively on the structural transformation that genuinely requires parser-level support.

## The `directivePatterns` System (For Spec Authors)

v5 introduces `directivePatterns`, a new field in `ExtendedSpec` that allows spec packages to declare how framework-specific directive attributes map to standard HTML attributes. This is the mechanism that made htmx-parser unnecessary and simplified alpine-parser.

### How It Works

A spec package defines an array of `directivePatterns` entries. Each entry specifies a regex pattern that matches directive attributes and a mapping rule that resolves them to their standard equivalents:

```ts
const spec: ExtendedSpec = {
  directivePatterns: [
    {
      pattern: '^hx-on[:-]([a-z]+)$',
      potentialName: 'on$1',
      isDirective: true,
      isDynamicValue: true,
    },
  ],
};
```

In this example, the pattern `hx-on:click` resolves to `potentialName = "onclick"`, allowing markuplint to validate the attribute against the HTML spec without the parser needing to know about htmx. The `$1` placeholder in `potentialName` references the first capture group from the regex pattern.

### When to Use `directivePatterns` vs. a Parser

| Scenario | Solution |
|----------|----------|
| Directive attributes that map to standard attributes (`x-bind:href` to `href`) | `directivePatterns` in a spec package |
| Structural transformations that change the AST (`<template x-for>` loops) | A parser package |
| Custom components with special semantics | Pretenders or a spec package |

If your framework only adds directive attributes that resolve to standard HTML attributes, you only need a spec package with `directivePatterns`. A parser is only necessary when the framework introduces structural syntax that changes how the document tree is parsed.

## Migration Checklist

### htmx Users

1. Uninstall `@markuplint/htmx-parser`:
   ```bash
   npm uninstall @markuplint/htmx-parser
   ```
2. Install `@markuplint/htmx-spec`:
   ```bash
   npm install @markuplint/htmx-spec
   ```
3. Update your markuplint config -- remove the `parser` entry and change the `specs` entry:
   ```diff
    {
   -  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
   -  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
   +  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
    }
   ```

### Alpine.js Users

1. Install `@markuplint/alpine-spec` (keep `@markuplint/alpine-parser`):
   ```bash
   npm install @markuplint/alpine-spec
   ```
2. Update your markuplint config -- change the `specs` entry:
   ```diff
    {
      "parser": { "\\.html$": "@markuplint/alpine-parser" },
   -  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
   +  "specs": { "\\.html$": "@markuplint/alpine-spec" }
    }
   ```
