# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Features

- **markdown-parser,pug-parser:** force fragment parsing for embedded HTML ([57c4172](https://github.com/markuplint/markuplint/commit/57c4172d5a68adb7e20a4f4e4d8dbe802983e3ca)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **markdown-parser,pug-parser:** forward embedded HTML parseErrors to outer document ([9ec7988](https://github.com/markuplint/markuplint/commit/9ec79882840cbedd76c5b8f774ff10c876d2c858)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

- feat!: adapt framework parsers to UUID-based node references ([6d543b8](https://github.com/markuplint/markuplint/commit/6d543b8c11506fe113d0ceeae3526f552f4ee26d))

### BREAKING CHANGES

- Parser output no longer contains parentNode/pairNode
  object references. Use parentNodeUuid/pairNodeUuid string fields instead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/pug-parser

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))

- refactor(pug-parser)!: update for simplified AST token properties ([7e0704e](https://github.com/markuplint/markuplint/commit/7e0704e32761f418a0c2e078557e797dae80b722))

### Features

- **pug-parser:** support loop blocks ([1ed3ab8](https://github.com/markuplint/markuplint/commit/1ed3ab82203dbb32389c78a669a43412a8b407e2))

### BREAKING CHANGES

- Adapt to renamed token properties and add
  blockBehavior to visitElement calls.

* Token property access: startOffset -> offset, startLine -> line,
  startCol -> col
* Update test assertions for new property names
* Add blockBehavior: null to element creation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.6.23](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.22...@markuplint/pug-parser@4.6.23) (2026-02-10)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.22](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.21...@markuplint/pug-parser@4.6.22) (2025-11-05)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.21](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.20...@markuplint/pug-parser@4.6.21) (2025-08-24)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.20](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.19...@markuplint/pug-parser@4.6.20) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.6.19](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.18...@markuplint/pug-parser@4.6.19) (2025-04-13)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.18](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.17...@markuplint/pug-parser@4.6.18) (2025-03-09)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.17](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.16...@markuplint/pug-parser@4.6.17) (2025-02-27)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.16](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.15...@markuplint/pug-parser@4.6.16) (2025-02-11)

### Bug Fixes

- **pug-parser:** implemented previously unsupported nodes, including `InterpolatedTag` ([a89e39a](https://github.com/markuplint/markuplint/commit/a89e39ab5bc09bfef2c7bc7fdcba65f6b672eb34)), closes [#2440](https://github.com/markuplint/markuplint/issues/2440)

## [4.6.15](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.14...@markuplint/pug-parser@4.6.15) (2025-02-04)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.14](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.13...@markuplint/pug-parser@4.6.14) (2024-12-04)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.13](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.12...@markuplint/pug-parser@4.6.13) (2024-11-17)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.12](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.11...@markuplint/pug-parser@4.6.12) (2024-10-31)

### Performance Improvements

- **pug-parser:** prevent redundant recursive parsing ([d883826](https://github.com/markuplint/markuplint/commit/d883826d25745a31f45e5ba7cde1dfa8f32a358c))
- **pug-parser:** return null in `visitSpreadAttr` for Pug, as the method is unnecessary ([56e0d61](https://github.com/markuplint/markuplint/commit/56e0d61e370872a4328ff3e70a89947bc6fbcf7a))

## [4.6.11](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.10...@markuplint/pug-parser@4.6.11) (2024-10-28)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.10](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.9...@markuplint/pug-parser@4.6.10) (2024-10-27)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.9](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.8...@markuplint/pug-parser@4.6.9) (2024-10-15)

### Bug Fixes

- **pug-parser:** fix parsing outdent code ([dd50bb4](https://github.com/markuplint/markuplint/commit/dd50bb423bbd1c466fe10c59a1778b5572d60457))

## [4.6.8](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.7...@markuplint/pug-parser@4.6.8) (2024-10-14)

### Bug Fixes

- **pug-parser:** fix to support `BlockComment` node ([afa721c](https://github.com/markuplint/markuplint/commit/afa721cd29cab8a47fa27cefe808d3fb7066b42e))

## [4.6.7](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.6...@markuplint/pug-parser@4.6.7) (2024-09-23)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.6](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.5...@markuplint/pug-parser@4.6.6) (2024-09-02)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.5](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.4...@markuplint/pug-parser@4.6.5) (2024-06-25)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.3...@markuplint/pug-parser@4.6.4) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.2...@markuplint/pug-parser@4.6.3) (2024-05-28)

### Bug Fixes

- **pug-parser:** add to parse `NamedBlock` ([f5197ff](https://github.com/markuplint/markuplint/commit/f5197ffd5281a9a67ad62dfc340b4422a3c20237)), closes [#1741](https://github.com/markuplint/markuplint/issues/1741)

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.1...@markuplint/pug-parser@4.6.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.1-alpha.0...@markuplint/pug-parser@4.6.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/pug-parser

## [4.6.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/pug-parser@4.6.0...@markuplint/pug-parser@4.6.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/pug-parser
