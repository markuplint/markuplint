---
sidebar_position: 5
title: 'The :closest() selector'
---

# The `:closest()` selector

The `:closest()` pseudo-class, which was deprecated in v5, is removed. A selector that has it is an invalid selector, as one that has `:hover` is: the selector of a `nodeRules` or `childNodeRules` entry, the selector that `--search` takes, and the selector that `@markuplint/selector` is given.

A config with such a selector is not skipped. The document gets an error (`parse-error`, `Unsupported pseudo :closest(...) selector.`), and no rule runs on it.

## What to do {#what-to-do}

Replace `:closest(X)` with `:is(X *)`. Both match an element that has an ancestor that matches `X`. The specificity of `:closest(X)` in v5 was that of `X`, and `:is(X *)` has the same, because the `*` adds none.

| v5                                  | v6                            |
| ----------------------------------- | ----------------------------- |
| `:closest(nav)`                     | `:is(nav *)`                  |
| `:closest(.wrapper)`                | `:is(.wrapper *)`             |
| `div:closest(nav):closest(section)` | `div:is(nav *):is(section *)` |
| `:closest(nav, aside)`              | `:is(nav *, aside *)`         |

When `X` is a list, put the `*` after each selector of it. `:is(nav, aside *)` means `nav`, or `aside *`.

An ancestor is looked for in the tree of the element, as it was with `:closest()`: the content of a `<template>` element is a tree of its own, and `:is(section *)` does not reach a `<section>` that is outside of it. See [Trees](/docs/guides/selectors#trees).
