# AST

Affects parser plugins and custom rules that read **AST** tokens. The DOM layer (`MLElement`, `MLToken` getters `startOffset` / `endOffset`, etc.) is unchanged.

| Change | v4 | v5 |
| --- | --- | --- |
| Start position | `startOffset`, `startLine`, `startCol` | `offset`, `line`, `col` |
| End position | `endOffset`, `endLine`, `endCol` | Derive from `offset` + `raw`, or `@markuplint/parser-utils/location` (`getEndLine`, `getEndCol`, `getEndPosition`) |
| Self-closing | `selfClosingSolidus` | `tagCloseChar` starts with `/` |
| Conditionals | `conditionalType` | `blockBehavior?.type` (`MLASTBlockBehavior`) |
| Parser type | `MLMarkupLanguageParser` / `Parse` | `MLParser` |
| `getNamespace` | `@markuplint/html-parser` `(tagName, parentNamespace?)` | `@markuplint/parser-utils` `(currentNodeName, parentNode)` |
