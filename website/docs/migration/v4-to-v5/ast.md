---
sidebar_position: 8
title: 'AST'
---

# AST

Affects parser plugins and custom rules that read **AST** tokens. The DOM layer (`MLElement`, `MLToken` getters `startOffset` / `endOffset`, etc.) is unchanged.

| Change                    | v4                                                      | v5                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start position            | `startOffset`, `startLine`, `startCol`                  | `offset`, `line`, `col`                                                                                                                                                                             |
| End position              | `endOffset`, `endLine`, `endCol`                        | Derive from `offset` + `raw`, or `@markuplint/parser-utils/location` (`getEndLine`, `getEndCol`, `getEndPosition`)                                                                                  |
| Self-closing              | `selfClosingSolidus`                                    | `tagCloseChar` starts with `/`                                                                                                                                                                      |
| Conditionals              | `conditionalType`                                       | `blockBehavior?.type` (`MLASTBlockBehavior`)                                                                                                                                                        |
| Parser type               | `MLMarkupLanguageParser` / `Parse`                      | `MLParser`                                                                                                                                                                                          |
| `getNamespace`            | `@markuplint/html-parser` `(tagName, parentNamespace?)` | `@markuplint/parser-utils` `(currentNodeName, parentNode)`                                                                                                                                          |
| Parent/pair reference     | `parentNode` / `pairNode` (object reference)            | `parentNodeUuid` / `pairNodeUuid` (string); resolve against `MLASTDocument.nodeList`                                                                                                                |
| Unquoted value terminator | `/` also terminates the value                           | Only whitespace / `>` terminate; `/` stays part of the value ([HTML LS — attribute value (unquoted) state](<https://html.spec.whatwg.org/multipage/parsing.html#attribute-value-(unquoted)-state>)) |

`endOfUnquotedValueChars` (parser-utils `attrTokenizer()` / `visitAttr()`) no longer includes `/` by default. Bundled parsers that rely on the default — `html-parser`, `vue-parser`, `ejs-parser`, `astro-parser`, `mdx-parser`, `jsx-parser`, `svelte-parser` — now keep `/` as part of an unquoted attribute value instead of splitting on it (for example `<img src=path/to/file.png>` no longer truncates the value at the first `/`). `pug-parser` passes its own `endOfUnquotedValueChars: []` and is unaffected. A custom parser or rule that called `attrTokenizer()` / `visitAttr()` and relied on `/` terminating the value must pass `endOfUnquotedValueChars` explicitly.
