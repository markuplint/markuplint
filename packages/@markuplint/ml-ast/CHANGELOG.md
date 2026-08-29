# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Features

- **ml-ast:** add documentMode to ParserOptions ([530493e](https://github.com/markuplint/markuplint/commit/530493e7f99eb27dd2f420666474e233db450c26)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-ast:** add MLASTParseError + MLASTParseErrorCode types and parseErrors field ([be34fbd](https://github.com/markuplint/markuplint/commit/be34fbd36ba7fb36b0a07cd6e865c8d81d8752ae)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

- feat(ml-ast)!: replace parentNode/pairNode with UUID string references ([9d56f45](https://github.com/markuplint/markuplint/commit/9d56f4545e7e6b2378043c3c578130bb4ddd72cd))

### BREAKING CHANGES

- `parentNode` and `pairNode` properties on AST nodes
  are replaced by `parentNodeUuid` and `pairNodeUuid` (UUID strings).
  The old object reference properties are removed from the parse output
  by post-processing.

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/ml-ast

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))

- feat(ml-ast)!: simplify AST token properties and restructure block types ([78f8a77](https://github.com/markuplint/markuplint/commit/78f8a77c76728df8090fcf54c7c5541bedb56f9d))

### BREAKING CHANGES

- Multiple breaking changes to AST interfaces:

Token property renames (MLASTToken):

- startOffset -> offset
- startLine -> line
- startCol -> col
- Remove endOffset, endLine, endCol (derive via helpers)

Element changes (MLASTElement):

- Remove selfClosingSolidus property
- Add blockBehavior: MLASTBlockBehavior | null

Block changes (MLASTPreprocessorSpecificBlock):

- Remove conditionalType property
- Add blockBehavior: MLASTBlockBehavior | null

New types:

- MLASTBlockBehavior interface (type + expression)
- MLASTBlockBehaviorType (replaces MLASTPreprocessorSpecificBlockConditionalType)

Removed deprecated types:

- MLMarkupLanguageParser interface
- Parse type alias

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.4.11](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.10...@markuplint/ml-ast@4.4.11) (2026-02-10)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.10](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.9...@markuplint/ml-ast@4.4.10) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.4.9](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.8...@markuplint/ml-ast@4.4.9) (2024-11-17)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.8](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.7...@markuplint/ml-ast@4.4.8) (2024-10-28)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.7](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.6...@markuplint/ml-ast@4.4.7) (2024-10-27)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.6](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.5...@markuplint/ml-ast@4.4.6) (2024-10-15)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.5](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.4...@markuplint/ml-ast@4.4.5) (2024-10-14)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.3...@markuplint/ml-ast@4.4.4) (2024-09-23)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.2...@markuplint/ml-ast@4.4.3) (2024-09-02)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.1...@markuplint/ml-ast@4.4.2) (2024-06-25)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.4.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.4.0...@markuplint/ml-ast@4.4.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.4.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.3.1...@markuplint/ml-ast@4.4.0) (2024-05-28)

### Features

- **ml-ast:** add `isFragment` to Element and PSBlock ([2d4dada](https://github.com/markuplint/markuplint/commit/2d4dada477be20a799e05fdebb6ad570234d4a00))

## [4.3.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.3.1-alpha.0...@markuplint/ml-ast@4.3.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-ast

## [4.3.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-ast@4.3.0...@markuplint/ml-ast@4.3.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-ast
