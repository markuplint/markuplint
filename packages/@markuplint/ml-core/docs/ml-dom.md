# MLDOM Reference

Detailed reference for the MLDOM subsystem in `@markuplint/ml-core`.

## Documents

| Document                                   | Description                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [Overview](./ml-dom/overview.md)           | Overview, class hierarchy, MLToken                                                                   |
| [MLNode](./ml-dom/node.md)                 | MLNode abstract base, MLParentNode                                                                   |
| [MLDocument](./ml-dom/document.md)         | Document root node                                                                                   |
| [MLElement](./ml-dom/element.md)           | Element node (selector matching, attributes, omitted elements)                                       |
| [Pretender System](./ml-dom/pretender.md)  | Virtual element mapping for component linting (initialization, property delegation, accessible name) |
| [MLAttr](./ml-dom/attr.md)                 | Attribute node (token decomposition, spread attributes)                                              |
| [MLBlock](./ml-dom/block.md)               | Preprocessor block node (transparency, conditional child nodes, content model validation)            |
| [Rule Mapping](./ml-dom/rule-mapping.md)   | How rules are applied to nodes (three-layer processing, specificity resolution)                      |
| [Other Node Types](./ml-dom/others.md)     | MLCharacterData, MLText, MLComment, MLDocumentType, MLElementCloseTag, MLDocumentFragment            |
| [Helpers & Utilities](./ml-dom/helpers.md) | Helper functions, supplementary classes, type utilities                                              |
