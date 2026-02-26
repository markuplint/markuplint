---
sidebar_position: 5
title: Framework Parsers
---

# Framework Parser Changes

v5 changes how htmx and Alpine.js are supported. Most other framework parsers (Vue, React, Svelte, etc.) are **unchanged**.

## What changed

| Change                                   | Who is affected      |
| ---------------------------------------- | -------------------- |
| `@markuplint/htmx-parser` removed        | htmx users           |
| `@markuplint/alpine-parser/spec` removed | Alpine.js users      |
| New `@markuplint/alpine-spec` package    | Alpine.js users      |
| New `directivePatterns` system           | Spec package authors |
| `useIDLAttributeNames` renamed           | Spec package authors |

## htmx: Switch from parser to spec package

htmx no longer needs a parser. The new `@markuplint/htmx-spec` package handles attribute resolution (like `hx-on:click` to `onclick`) at the spec level.

### Before (v4)

```bash
npm install @markuplint/htmx-parser
```

```json
{
  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
}
```

### After (v5)

```bash
npm uninstall @markuplint/htmx-parser
npm install @markuplint/htmx-spec
```

```json
{
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
}
```

The diff in your config:

```diff
 {
-  "parser": { "\\.[jt]sx?$": "@markuplint/htmx-parser" },
-  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-parser/spec" }
+  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
 }
```

## Alpine.js: Install the new spec package

The Alpine.js parser now handles only `<template x-for>` loops. Attribute resolution (`x-bind:href`, `@click`, `:class`, etc.) moved to the new `@markuplint/alpine-spec` package.

### Before (v4)

```bash
npm install @markuplint/alpine-parser
```

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
}
```

### After (v5)

```bash
npm install @markuplint/alpine-parser @markuplint/alpine-spec
```

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-spec" }
}
```

The diff in your config:

```diff
 {
   "parser": { "\\.html$": "@markuplint/alpine-parser" },
-  "specs": { "\\.html$": "@markuplint/alpine-parser/spec" }
+  "specs": { "\\.html$": "@markuplint/alpine-spec" }
 }
```

:::note
The parser is still required for Alpine.js. The `<template x-for>` directive creates loop structures that need AST-level handling.
:::

## The `directivePatterns` system

:::info
This section is for spec package authors. Skip it if you are an end user.
:::

v5 introduces `directivePatterns`, a new field in `ExtendedSpec`. It lets spec packages declare how framework directive attributes map to standard HTML attributes -- without writing a parser.

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

In this example, `hx-on:click` resolves to `onclick`. The `$1` placeholder references the first regex capture group.

### When to use `directivePatterns` vs. a parser

| Scenario                                            | Solution                              |
| --------------------------------------------------- | ------------------------------------- |
| Directive attributes mapping to standard attributes | `directivePatterns` in a spec package |
| Structural transformations that change the AST      | A parser package                      |
| Custom components with special semantics            | Pretenders or a spec package          |

## `useIDLAttributeNames` renamed to `acceptedAttrNames`

:::info
This section is for spec package authors. Skip it if you are an end user.
:::

The `ExtendedSpec` property `useIDLAttributeNames` has been renamed to `acceptedAttrNames` to better reflect its purpose.

```diff
 const spec: ExtendedSpec = {
-  useIDLAttributeNames: true,
+  acceptedAttrNames: 'idl',
 };
```

Both `@markuplint/react-spec` and `@markuplint/svelte-spec` now use this API. If you have a custom spec package that sets `useIDLAttributeNames`, update it to `acceptedAttrNames`.

## Other framework parsers

Vue, React, Svelte, JSX, Pug, EJS, ERB, Liquid, Mustache, Nunjucks, PHP, and Smarty parsers have **no breaking changes** in v5. No migration is needed.
