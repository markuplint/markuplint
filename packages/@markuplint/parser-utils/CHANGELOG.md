# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **parser-utils:** handle raw-text element body in parseCodeFragment per HTML LS §13.2.5.1 ([4a1b0f7](https://github.com/markuplint/markuplint/commit/4a1b0f701c5c0eec91b325c4f3a9f9fb773766e8)), closes [#3825](https://github.com/markuplint/markuplint/issues/3825)

### Features

- **parser-utils:** introduce accumulateParseErrors() for embedded parser delegation ([49e15d6](https://github.com/markuplint/markuplint/commit/49e15d6f528282ca145e77baf03ae8f6561b2b09)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **parser-utils:** propagate Tokenized.parseErrors onto MLASTDocument ([37c8430](https://github.com/markuplint/markuplint/commit/37c8430f454d24d691e093fda9e9fb71b658b4d2)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/parser-utils

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/parser-utils

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

- fix(parser-utils)!: align unquoted attribute value tokenizer with HTML spec ([5168c04](https://github.com/markuplint/markuplint/commit/5168c041a1d37a7080f12e3c7569b5bbacd5a2f1))
- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))
- feat(parser-utils)!: remove deprecated getLine and getCol functions ([51cd7a2](https://github.com/markuplint/markuplint/commit/51cd7a28b7fcdd4a9d52d57f35c55b97b3b196fe))

### BREAKING CHANGES

- The default `endOfUnquotedValueChars` no longer includes `/`.
  Unquoted attribute values preserve `/` as part of the value, matching the
  WHATWG HTML "attribute value (unquoted) state". Consumers that relied on `/`
  as a terminator must pass `endOfUnquotedValueChars: ['\t', '\n', '\f', '\r',
' ', '/', '>']` explicitly to `visitAttr()` / `attrTokenizer()`.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>

- ESLint is no longer used. Use oxlint instead.
- getLine() and getCol() have been removed.
  Use getPosition() instead.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/parser-utils

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/parser-utils

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/parser-utils

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **parser-utils:** add MathML namespace detection ([6c27e45](https://github.com/markuplint/markuplint/commit/6c27e45475104d744a8109e8e36698bd9dba4e8b))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

### Bug Fixes

- **parser-utils:** skip text trimming when text node is a descendant of the next node ([1bfcede](https://github.com/markuplint/markuplint/commit/1bfcedebbd115ea817df76a979b4e10a26d0a2b2))

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))
- resolve additional eslint-plugin-unicorn v63 errors ([e58a72c](https://github.com/markuplint/markuplint/commit/e58a72c17c97bbec522f9513b99777fac6904d64))
- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))

- feat(parser-utils)!: adapt to simplified MLASTToken properties ([5cbbc9c](https://github.com/markuplint/markuplint/commit/5cbbc9ca8f77a71d99bffa14b193c79b26c1c415))

### BREAKING CHANGES

- Update Token type and parser internals for
  simplified AST token properties.

Token type property renames:

- startOffset -> offset
- startLine -> line
- startCol -> col

Parser changes:

- createToken() no longer produces endOffset/endLine/endCol
- visitPsBlock() parameter: conditionalType -> blockBehavior
- visitElement() accepts blockBehavior option
- Remove selfClosingSolidus token generation
- Add getEndPosition() helper to get-location.ts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.8.11](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.10...@markuplint/parser-utils@4.8.11) (2026-02-10)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.10](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.9...@markuplint/parser-utils@4.8.10) (2025-11-05)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.9](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.8...@markuplint/parser-utils@4.8.9) (2025-08-24)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.8](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.7...@markuplint/parser-utils@4.8.8) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.8.7](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.6...@markuplint/parser-utils@4.8.7) (2025-04-13)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.6](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.5...@markuplint/parser-utils@4.8.6) (2025-03-09)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.5](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.4...@markuplint/parser-utils@4.8.5) (2025-02-27)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.4](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.3...@markuplint/parser-utils@4.8.4) (2025-02-11)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.3](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.2...@markuplint/parser-utils@4.8.3) (2025-02-04)

### Bug Fixes

- y2 idl-attributes ([a8b325b](https://github.com/markuplint/markuplint/commit/a8b325bf9af1cdb4b6f982bf5833f90a0e9eb26c))

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.1...@markuplint/parser-utils@4.8.2) (2024-12-04)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.8.0...@markuplint/parser-utils@4.8.1) (2024-11-17)

### Bug Fixes

- **parser-utils:** correct content attribute name for `httpEquiv` ([ddfbeb3](https://github.com/markuplint/markuplint/commit/ddfbeb32ff530b14c7ddceb56558d88624218b0b))

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.7.2...@markuplint/parser-utils@4.8.0) (2024-10-31)

### Features

- **parser-utils:** add filter option to `nodeTreeDebugView` ([8c3d618](https://github.com/markuplint/markuplint/commit/8c3d618ef50902b379c50c7b43b13d242dfe3b2b))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.7.1...@markuplint/parser-utils@4.7.2) (2024-10-28)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.7.0...@markuplint/parser-utils@4.7.1) (2024-10-27)

### Performance Improvements

- **parser-utils:** adjusted siblings correction timing to reduce exponential complexity ([676357c](https://github.com/markuplint/markuplint/commit/676357c438df7545f472787c9032463f9fdba515))

# [4.7.0](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.8...@markuplint/parser-utils@4.7.0) (2024-10-15)

### Features

- **parser-utils:** expose `getOffsetsFromCode` function ([8ef7aec](https://github.com/markuplint/markuplint/commit/8ef7aec26d3198328c86ebeffaa0bd9c879a1f0e))

## [4.6.8](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.7...@markuplint/parser-utils@4.6.8) (2024-10-14)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.6.7](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.6...@markuplint/parser-utils@4.6.7) (2024-09-23)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.6.6](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.5...@markuplint/parser-utils@4.6.6) (2024-09-02)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.6.5](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.4...@markuplint/parser-utils@4.6.5) (2024-06-25)

### Bug Fixes

- **parser-utils:** modify to treat attrs start with `script` type quotation marks as spread attr ([617b6d0](https://github.com/markuplint/markuplint/commit/617b6d0fbba1d245ca21360908b643f123818037))

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.3...@markuplint/parser-utils@4.6.4) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.2...@markuplint/parser-utils@4.6.3) (2024-05-28)

### Bug Fixes

- **parser-utils:** correct length calculation for surrogate pairs in validScript ([37a712c](https://github.com/markuplint/markuplint/commit/37a712c2836bd701c680c1263669e105c0a8dea5))

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.1...@markuplint/parser-utils@4.6.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.1-alpha.0...@markuplint/parser-utils@4.6.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/parser-utils

## [4.6.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/parser-utils@4.6.0...@markuplint/parser-utils@4.6.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/parser-utils
