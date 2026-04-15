# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))

### BREAKING CHANGES

- ESLint is no longer used. Use oxlint instead.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/html-parser

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/html-parser

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/html-parser

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/html-parser

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/html-parser

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))

- refactor(html-parser)!: update for simplified AST token properties ([524ce5d](https://github.com/markuplint/markuplint/commit/524ce5d6fc23c8bff73583ed4ac42fdff1759938))

### BREAKING CHANGES

- Adapt to renamed MLASTToken properties.

* Use getEndPosition() for ghost element position calculation
* Update test assertions: startCol -> col, startOffset -> offset,
  startLine -> line
* Remove endOffset/endLine/endCol assertions from tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.6.23](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.22...@markuplint/html-parser@4.6.23) (2026-02-10)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.22](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.21...@markuplint/html-parser@4.6.22) (2025-11-05)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.21](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.20...@markuplint/html-parser@4.6.21) (2025-08-24)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.20](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.19...@markuplint/html-parser@4.6.20) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.6.19](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.18...@markuplint/html-parser@4.6.19) (2025-04-13)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.18](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.17...@markuplint/html-parser@4.6.18) (2025-03-09)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.17](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.16...@markuplint/html-parser@4.6.17) (2025-02-27)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.16](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.15...@markuplint/html-parser@4.6.16) (2025-02-11)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.15](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.14...@markuplint/html-parser@4.6.15) (2025-02-04)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.14](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.13...@markuplint/html-parser@4.6.14) (2024-12-04)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.13](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.12...@markuplint/html-parser@4.6.13) (2024-11-17)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.12](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.11...@markuplint/html-parser@4.6.12) (2024-10-31)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.11](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.10...@markuplint/html-parser@4.6.11) (2024-10-28)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.10](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.9...@markuplint/html-parser@4.6.10) (2024-10-27)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.9](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.8...@markuplint/html-parser@4.6.9) (2024-10-15)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.8](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.7...@markuplint/html-parser@4.6.8) (2024-10-14)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.7](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.6...@markuplint/html-parser@4.6.7) (2024-09-23)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.6](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.5...@markuplint/html-parser@4.6.6) (2024-09-02)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.5](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.4...@markuplint/html-parser@4.6.5) (2024-06-25)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.3...@markuplint/html-parser@4.6.4) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.2...@markuplint/html-parser@4.6.3) (2024-05-28)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.1...@markuplint/html-parser@4.6.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.1-alpha.0...@markuplint/html-parser@4.6.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/html-parser

## [4.6.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-parser@4.6.0...@markuplint/html-parser@4.6.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/html-parser
