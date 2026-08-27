# `parse-error`

Not a rule rename. The built-in `parse-error` channel in v4 reported **fatal** `ParserError`s only. v5 can also surface non-fatal HTML LS tokenizer / tree-construction errors (parse5 `onParseError`). **Off by default.**

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

`parserOptions.documentMode`: `'auto'` (default), `'document'`, or `'fragment'` — overrides document-vs-fragment detection (for example SSR partials starting with `<head>`, or a full page without a doctype when opting into `missing-doctype`).
