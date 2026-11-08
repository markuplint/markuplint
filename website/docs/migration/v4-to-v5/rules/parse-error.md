---
sidebar_position: 5
title: 'parse-error'
---

# `parse-error`

Not a rule rename. The built-in `parse-error` channel in v4 reported **fatal** `ParserError`s only. v5 can also surface non-fatal HTML LS tokenizer / tree-construction errors (parse5 `onParseError`), and the errors that a framework parser reports for markup its compiler does not accept. **Off by default.**

```json
{
  "severity": {
    "parseError": "error"
  }
}
```

Or per code (`MLASTParseErrorCode` from `@markuplint/ml-ast`):

```json
{
  "severity": {
    "parseError": {
      "duplicate-attribute": "error",
      "nested-comment": "warning"
    }
  }
}
```

Unlisted codes stay off. Existing configs that omit `severity.parseError` keep v4 silence for non-fatal events.

A framework parser can report a code of its own, which is not parse5's:

| Code                          | Parser                   | Meaning                                                                                                                                                                           |
| ----------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vue-ignored-side-effect-tag` | `@markuplint/vue-parser` | A `<style>` or a `<script>` in the template. Vue removes it ("Tags with side effect (`<script>` and `<style>`) are ignored in client component templates."), so no rule checks it |

`parserOptions.documentMode`: `'auto'` (default), `'document'`, or `'fragment'` — overrides document-vs-fragment detection (for example SSR partials starting with `<head>`, or a full page without a doctype when opting into `missing-doctype`).
