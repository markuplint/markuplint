# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/ml-core

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))
- treat orphaned end tags as bogus instead of plain text ([#1575](https://github.com/markuplint/markuplint/issues/1575)) ([557199a](https://github.com/markuplint/markuplint/commit/557199a6960ab35573a544f9a33c00e98eb9967e))
- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))

- feat(ml-core)!: adapt DOM layer to simplified AST types ([5d92f2b](https://github.com/markuplint/markuplint/commit/5d92f2be75ce0d45823fb26f72588aecee278ba3))

### Features

- delete htmx-parser, simplify alpine-parser, add migration guide and tests ([f8dbb09](https://github.com/markuplint/markuplint/commit/f8dbb090707d8cfbf3d859a9b868b2087064f89b))
- **ml-core:** add directive and IDL resolution to MLAttr constructor ([ba0ad66](https://github.com/markuplint/markuplint/commit/ba0ad66585c022cdb34fda8a8191bcc9af078e07))
- **ml-core:** add expandNamedRules for named rule groups in rules section ([7eed355](https://github.com/markuplint/markuplint/commit/7eed355075cee90b17a79c0f8a5b18213d1ce54e))
- **ml-core:** implement VirtualRule system for named nodeRules ([864f51d](https://github.com/markuplint/markuplint/commit/864f51d54dba26c6af2bc45eea3566db5f7d8e26))
- **ml-core:** require defaultValue for non-boolean rule types in createRule ([6c99908](https://github.com/markuplint/markuplint/commit/6c999087feff4fb8906cf47d564ee08ca8e5f450)), closes [#808](https://github.com/markuplint/markuplint/issues/808)
- **ml-core:** the each block skips linting in childNodes ([d5ca83d](https://github.com/markuplint/markuplint/commit/d5ca83d5ec6dc9b2f40b5d6599b07cc4746f3dca))
- **ml-core:** wire ruleCommonSettings through MLCore to Document ([28bb176](https://github.com/markuplint/markuplint/commit/28bb17601b983b3789b2ae200bd77ad887905cda))
- **ml-spec:** add declarative directivePatterns for parser-less framework support ([ceb9aa6](https://github.com/markuplint/markuplint/commit/ceb9aa67048e3a058b40a9e4d91eb903c8ff1861))

### Performance Improvements

- **ml-core:** add memoization cache to MLElement.getAccessibleName() ([cdbe289](https://github.com/markuplint/markuplint/commit/cdbe289755312ee30e3f02171f42bf2c00412eea)), closes [#2179](https://github.com/markuplint/markuplint/issues/2179)

### BREAKING CHANGES

- Multiple breaking changes to DOM API:

MLToken:

- Compute end positions via getEndCol/getEndLine helpers
  instead of storing them as private fields
- Use \_astToken.offset/line/col directly

MLElement:

- Remove selfClosingSolidus property
- Add blockBehavior: MLASTBlockBehavior | null

MLBlock:

- Replace conditionalType with blockBehavior property

Node traversal:

- Use blockBehavior?.type instead of conditionalType

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.13.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.2...@markuplint/ml-core@4.13.3) (2026-02-10)

**Note:** Version bump only for package @markuplint/ml-core

## [4.13.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.1...@markuplint/ml-core@4.13.2) (2025-11-05)

**Note:** Version bump only for package @markuplint/ml-core

## [4.13.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.0...@markuplint/ml-core@4.13.1) (2025-08-24)

**Note:** Version bump only for package @markuplint/ml-core

# [4.13.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.4...@markuplint/ml-core@4.13.0) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

### Features

- **markuplint:** add maxViolations support to API layer ([cb6d577](https://github.com/markuplint/markuplint/commit/cb6d577483a38e32a378d89a13e950c0eb311b09))
- **markuplint:** add status field to MLResultInfo and simplify verification ([56deb99](https://github.com/markuplint/markuplint/commit/56deb999a330bb7d91333dc464a034cbc6010479))
- **ml-core:** add new DOM API properties from TypeScript 5.9.2 ([a6cfed3](https://github.com/markuplint/markuplint/commit/a6cfed32c3abf6874161aad9c4f5c47541320b7b))
- **ml-core:** add validation for rule existence ([4c7ee75](https://github.com/markuplint/markuplint/commit/4c7ee758bd98737e8df7b0aa247306e61e48d30a))
- **ml-core:** add ViolationCollector for performance optimization ([a4e9694](https://github.com/markuplint/markuplint/commit/a4e9694a87f3e0958a59974ad6d03775831ec399))
- **ml-core:** enhance ViolationCollector for max-count functionality ([92316a4](https://github.com/markuplint/markuplint/commit/92316a4b070a1d53ae12cf1ae8cfdf3444e02025))
- **ml-core:** implement consistent textContent property across DOM nodes ([6c0fb62](https://github.com/markuplint/markuplint/commit/6c0fb62ded45f779f30602bf11299e928bdf24aa))

## [4.12.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.3...@markuplint/ml-core@4.12.4) (2025-04-13)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.2...@markuplint/ml-core@4.12.3) (2025-03-09)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.1...@markuplint/ml-core@4.12.2) (2025-02-27)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.0...@markuplint/ml-core@4.12.1) (2025-02-11)

**Note:** Version bump only for package @markuplint/ml-core

# [4.12.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.11.0...@markuplint/ml-core@4.12.0) (2025-02-04)

### Bug Fixes

- **ml-core:** fix to match pretended element type selectors ([3f6d139](https://github.com/markuplint/markuplint/commit/3f6d1395ca6aab3698bfde771e8ba7086acb83c7))

### Features

- **ml-core:** add `matchMLSelector` method to Element ([cd822d6](https://github.com/markuplint/markuplint/commit/cd822d6f3f7b899ffbc03646337cb018d72ce5e7))

# [4.11.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.5...@markuplint/ml-core@4.11.0) (2024-12-04)

### Features

- **ml-core:** add `caretPositionFromPoint` prop to MLDocument ([8f7e822](https://github.com/markuplint/markuplint/commit/8f7e822d29f6ec287b9470eae0f4630cc2627eb7))
- **ml-core:** add `currentCSSZoom` prop to MLElement ([8b12e07](https://github.com/markuplint/markuplint/commit/8b12e07481ee1bbe2d54c9b4179e06ed01250662))
- **ml-core:** add `fragmentDirective` prop to MLDocument ([a62b6b1](https://github.com/markuplint/markuplint/commit/a62b6b10612601fd49bcd35f23723f0466d1b988))
- **ml-core:** add `writingSuggestions` prop to MLElement ([59c1d66](https://github.com/markuplint/markuplint/commit/59c1d6682cff93a17d0da8da3cd3c4dd1c63482b))

## [4.10.5](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.4...@markuplint/ml-core@4.10.5) (2024-11-17)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.3...@markuplint/ml-core@4.10.4) (2024-10-31)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.2...@markuplint/ml-core@4.10.3) (2024-10-28)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.1...@markuplint/ml-core@4.10.2) (2024-10-27)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.0...@markuplint/ml-core@4.10.1) (2024-10-15)

**Note:** Version bump only for package @markuplint/ml-core

# [4.10.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.9.0...@markuplint/ml-core@4.10.0) (2024-10-14)

### Features

- **ml-core:** enabled control over parse-error output using `severity.parseError` ([7ef6d6a](https://github.com/markuplint/markuplint/commit/7ef6d6ad58845c81367d5a2944c254a12eeaa17e))

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.3...@markuplint/ml-core@4.9.0) (2024-09-23)

### Features

- **ml-core:** update DOM API according to TypeScript DOM Libs ([b95b689](https://github.com/markuplint/markuplint/commit/b95b689a84f0a176175943edf5d4163de8b1522f))

## [4.8.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.2...@markuplint/ml-core@4.8.3) (2024-09-02)

**Note:** Version bump only for package @markuplint/ml-core

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.1...@markuplint/ml-core@4.8.2) (2024-06-25)

### Bug Fixes

- **ml-core:** `localName` returns lowercase when using case-sensitive parser for tag names ([b1acadd](https://github.com/markuplint/markuplint/commit/b1acaddfd6bf939ee809f6419ce85a701033ca4f))
- **ml-core:** selector matches both pretender's name and original name ([c683711](https://github.com/markuplint/markuplint/commit/c6837114638e07b22e8b35a4f6944e400222e69e))

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.0...@markuplint/ml-core@4.8.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.2...@markuplint/ml-core@4.8.0) (2024-05-28)

### Features

- **ml-core:** change `childNodes` to no longer return fragment nodes ([bc41f13](https://github.com/markuplint/markuplint/commit/bc41f13c15ee61616ab9673ed81df52d19786c31))
- **ml-core:** separate getter `childNodes` and method `getPureChildNodes()` ([a98d22c](https://github.com/markuplint/markuplint/commit/a98d22c5bd291158ceae21c52580136e49bb938b))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.1...@markuplint/ml-core@4.7.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/ml-core

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.1-alpha.0...@markuplint/ml-core@4.7.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-core

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.0...@markuplint/ml-core@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-core
