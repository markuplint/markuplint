---
sidebar_position: 5
title: 'Framework Parsers'
---

# Framework parsers

htmx and Alpine.js packaging changed. Other parser packages still exist; this page only covers what v4 configs named that no longer resolve.

## htmx

`@markuplint/htmx-parser` is gone. Use `@markuplint/htmx-spec` (no parser entry).

```json
{
  "specs": { "\\.[jt]sx?$": "@markuplint/htmx-spec" }
}
```

## Alpine.js

Keep `@markuplint/alpine-parser` for `<template x-for>`. Move specs from `@markuplint/alpine-parser/spec` to `@markuplint/alpine-spec`.

```json
{
  "parser": { "\\.html$": "@markuplint/alpine-parser" },
  "specs": { "\\.html$": "@markuplint/alpine-spec" }
}
```

## Spec authors

`ExtendedSpec.directivePatterns` maps directive attribute names to HTML names without a parser (used by htmx-spec).

`useIDLAttributeNames` is renamed to `acceptedAttrNames` (for example `'idl'`). `@markuplint/react-spec` and `@markuplint/svelte-spec` use the new name.
