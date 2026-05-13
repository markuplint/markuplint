---
sidebar_position: 5
title: parse-error
---

# `parse-error` (Built-in violation channel) — non-fatal parser errors

The built-in `parse-error` violation channel now also surfaces **non-fatal** HTML LS parse errors (parse5 `onParseError` events). The channel is **off by default**; users opt in per parse5 code.

## Summary

| Change                                                                                          | Who is affected                                                          |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `parse-error` can now surface non-fatal parser errors (in addition to fatal `ParserError`s)     | Anyone who opts in via `severity.parseError`. No-op for existing configs |
| `severity.parseError` accepts a `Partial<Record<MLASTParseErrorCode, …>>` for per-code severity | Anyone who needs finer-grained control than a single severity            |

This is **not a breaking change** — the new non-fatal codes stay silent until you opt in.

## What changed

In v4, the `parse-error` channel only fired when the parser threw a **fatal** `ParserError` (the document was unprocessable). Non-fatal HTML LS tokenizer / tree-construction parse errors — events that parse5 emits via [`onParseError`](https://parse5.js.org/interfaces/parse5.ParserOptions.html#onParseError) and that the parser silently recovers from per [HTML LS §13.2.5](https://html.spec.whatwg.org/multipage/parsing.html#tokenization) — were dropped.

In v5, those same events flow through `MLASTDocument.parseErrors` and become `ruleId: 'parse-error'` violations **when** `severity.parseError` opts them in. Each event becomes one violation.

## Example

Source HTML with two HTML LS parse errors (`nested-comment` and `duplicate-attribute`):

```html
<!-- outer <!-- inner -->
tail -->
<div a a></div>
```

**Default config — no opt-in:**

```jsonc
// markuplint.config.jsonc
{
  "rules": {
    /* … your rules … */
  },
}
```

→ 0 `parse-error` violations.

**Uniform opt-in (every code enabled):**

```jsonc
{
  "severity": {
    "parseError": "error",
  },
}
```

→ 2 `parse-error` violations (1 `nested-comment` + 1 `duplicate-attribute`).

**Per-code opt-in (Record form):**

```jsonc
{
  "severity": {
    "parseError": {
      "duplicate-attribute": "error",
      "nested-comment": "warning",
    },
  },
}
```

→ 2 `parse-error` violations: `nested-comment` at `warning`, `duplicate-attribute` at `error`. Codes that are not listed remain off.

## Common parse5 codes you might enable

| Code                                                    | What it means                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `duplicate-attribute`                                   | An attribute name appeared twice on the same element (e.g., `<img src=a src=b>`).                         |
| `nested-comment`                                        | A `<!--` opener appeared inside an unclosed comment.                                                      |
| `eof-in-doctype`                                        | End of file inside a `<!doctype …>` declaration.                                                          |
| `unexpected-null-character`                             | A literal `U+0000` byte appeared in the source.                                                           |
| `non-void-html-element-start-tag-with-trailing-solidus` | A non-void HTML element used the XHTML-style self-closing slash (e.g., `<div />`).                        |
| `incorrectly-opened-comment`                            | The token `<!` was followed by something other than `--` (often a template engine block — `<?php …>`).    |
| `unexpected-character-in-unquoted-attribute-value`      | An attribute value contained a character (e.g., `<`, `=`, backtick) that the spec forbids without quotes. |
| `missing-doctype`                                       | A full document (`<html>` starting) lacked `<!doctype html>`.                                             |
| `non-conforming-doctype`                                | The doctype declaration did not exactly match `<!doctype html>` (e.g., legacy HTML 4.01 doctype).         |

The full enumeration of 60 codes is captured by the `MLASTParseErrorCode` union exported from `@markuplint/ml-ast`; it mirrors [parse5's `ERR` enum](https://parse5.js.org/enums/parse5.ErrorCodes.html), where the names are stable identifiers from HTML LS.

## Three forms of `severity.parseError`

### 1. Single severity (legacy form)

Applies the same severity to **every** parser error code.

```jsonc
{ "severity": { "parseError": "error" } }
```

```jsonc
{ "severity": { "parseError": "warning" } }
```

```jsonc
{ "severity": { "parseError": "off" } } // also the default
```

### 2. Per-code record (recommended for targeted opt-in)

Each key is a `MLASTParseErrorCode`; the value is `'error' | 'warning' | 'info' | 'off' | boolean`. Codes that are not listed default to `'off'`.

```jsonc
{
  "severity": {
    "parseError": {
      "duplicate-attribute": "error",
      "missing-doctype": "warning",
      "nested-comment": "error",
    },
  },
}
```

### 3. Unset (default)

Equivalent to `"off"` for every non-fatal code. Fatal `ParserError` (the parser threw and the document is unprocessable) still emits at `error` severity.

## Document vs fragment parsing (`parserOptions.documentMode`)

The HTML parser auto-detects whether the input is a full document or a fragment by looking at the start of the source:

- Starts with `<!doctype html>` or `<html>` → parsed as a document
- Anything else → parsed as a fragment

Some parse5 errors (`missing-doctype`, `misplaced-doctype`, `non-conforming-doctype`, …) are document-level only — they cannot fire on fragments. Two real-world situations need to override the auto-detection:

| Use case                                                                                         | Setting                                               |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| SSR / template partial that starts with `<head>`, `<meta>`, etc., and is _not_ a complete page   | `'fragment'` (silences `missing-doctype` and friends) |
| Complete HTML page that intentionally omits `<!doctype html>` and you want to be warned about it | `'document'` (surfaces the missing doctype error)     |

```jsonc
{
  "parserOptions": {
    "documentMode": "fragment", // or "document" or "auto" (default)
  },
  "severity": {
    "parseError": {
      "missing-doctype": "warning",
    },
  },
}
```

**Template-engine parsers**: Markdown's inline HTML blocks and Pug's raw HTML lines are always partials. `@markuplint/markdown-parser` and `@markuplint/pug-parser` force `'fragment'` for those internal calls regardless of user configuration, so you do not have to think about doctype errors leaking into Markdown / Pug source.

## Scope

The non-fatal channel only fires for parsers that populate `MLASTDocument.parseErrors`. Currently that's `@markuplint/html-parser` (and the `SvelteKitTemplateParser` / `HtmlInPugParser` derivatives that wrap it for `.html` templates).

Framework parsers — `@markuplint/jsx-parser`, `vue-parser`, `svelte-parser` (`.svelte` files), `astro-parser`, `pug-parser` (`.pug` files) — do **not** invoke parse5 and therefore do not emit non-fatal `parse-error` violations regardless of how `severity.parseError` is configured.

## Relationship with rule-level checks (automatic dedupe)

Some existing rules overlap in scope with parse5 codes. Examples:

| ml rule               | parse5 code that overlaps               |
| --------------------- | --------------------------------------- |
| `attr-duplication`    | `duplicate-attribute`                   |
| `doctype`             | `missing-doctype`                       |
| `no-orphaned-end-tag` | `end-tag-without-matching-open-element` |

When an ml rule that mirrors a parse5 code is **active in the ruleset**, `@markuplint/ml-core` automatically suppresses the corresponding code on the `parse-error` channel. You will not see two violations for the same underlying parse5 event — the ml rule's violation wins.

```jsonc
{
  "rules": { "attr-duplication": true },
  "severity": { "parseError": "error" },
}
```

For `<div a a></div>`:

- ✅ `attr-duplication` violation (from the rule)
- ❌ `parse-error` violation with `duplicate-attribute` (suppressed by dedupe)

Disable the ml rule and the parse5 channel takes over:

```jsonc
{
  "rules": { "attr-duplication": false },
  "severity": { "parseError": "error" },
}
```

- ✅ `parse-error` violation with `duplicate-attribute`

The dedupe is **hook-based**: each rule declares its own `meta.mirrorsParseErrorCodes` array (in `RuleSeed`). ml-core simply unions the lists across active rules — there is no hard-coded mapping in ml-core. Authors of new rules that overlap with parse5 events should declare them in `meta` to participate in the dedupe.

Rules whose detection is **wider** than parse5 (e.g. `attr-duplication` also covers JSX / SVG / authored components where parse5 never runs) are safe to mirror: parse5 only fires on HTML anyway, so the dedupe only ever skips events that the ml rule already reports.

Rules whose detection is **narrower or different** from a parse5 code (e.g. `character-reference` detects unescaped `<`, `>`, `&`, `"` — the opposite direction of parse5's `unknown-named-character-reference` etc.) **must not** declare `mirrorsParseErrorCodes`. The two layers stay independent and complementary.

### Dedupe is decided at the ruleset level

The dedupe check looks at the **top-level `rules` config** — not at per-node configuration. If you disable a mirroring rule locally via `nodeRules`:

```jsonc
{
  "rules": { "attr-duplication": true },
  "nodeRules": [{ "selector": "span", "rules": { "attr-duplication": false } }],
  "severity": { "parseError": "error" },
}
```

…the parse-error channel still treats `attr-duplication` as active globally and **does not re-surface** `duplicate-attribute` on `<span>`. For `<div><span attr attr></span></div>` you get zero violations on `<span>` — consistent with the intent of "I opted out of this check here", rather than "I expected the parse-error channel to fill the gap".

If you want the parse-error channel to fire on elements where a mirroring rule is locally disabled, disable the rule globally instead and enable just the parse5 code:

```jsonc
{
  "rules": { "attr-duplication": false },
  "severity": { "parseError": { "duplicate-attribute": "error" } },
}
```

## See also

- Built-in channel API: [`MLASTDocument.parseErrors`](https://github.com/markuplint/markuplint/blob/main/packages/%40markuplint/ml-ast/src/types.ts) and `MLASTParseErrorCode` in `@markuplint/ml-ast`
- HTML LS parse errors: [§13.2.5 Tokenization](https://html.spec.whatwg.org/multipage/parsing.html#tokenization)
- parse5 callback: [`onParseError`](https://parse5.js.org/interfaces/parse5.ParserOptions.html#onParseError)
- Implementation discussion: [#3844](https://github.com/markuplint/markuplint/issues/3844)
