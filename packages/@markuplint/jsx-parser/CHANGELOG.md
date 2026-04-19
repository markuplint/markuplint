# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

- feat!: adapt framework parsers to UUID-based node references ([6d543b8](https://github.com/markuplint/markuplint/commit/6d543b8c11506fe113d0ceeae3526f552f4ee26d))

### BREAKING CHANGES

- Parser output no longer contains parentNode/pairNode
  object references. Use parentNodeUuid/pairNodeUuid string fields instead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/jsx-parser

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **jsx-parser:** add type assertion for error.location in parseError ([7fc2d5c](https://github.com/markuplint/markuplint/commit/7fc2d5c5c01cf3877ce28a218884acae313f39ea))
- **jsx-parser:** use error.location instead of getter properties for parse error position ([674ad9a](https://github.com/markuplint/markuplint/commit/674ad9a5b9d71feda6d3f64839896e962a4d9f63))
- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))

- refactor(jsx-parser)!: update blockBehavior comment for new API ([efab137](https://github.com/markuplint/markuplint/commit/efab137c748647f64d6b4fbbcb0f48fc7f7a5217))

### Features

- **jsx-parser:** support loop blocks ([8b287a8](https://github.com/markuplint/markuplint/commit/8b287a811bab67a17a8dd9372058721e4416ab70))

### BREAKING CHANGES

- Replace conditionalType reference with
  blockBehavior in TODO comment.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.7.23](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.22...@markuplint/jsx-parser@4.7.23) (2026-02-10)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.22](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.21...@markuplint/jsx-parser@4.7.22) (2025-11-05)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.21](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.20...@markuplint/jsx-parser@4.7.21) (2025-08-24)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.20](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.19...@markuplint/jsx-parser@4.7.20) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.7.19](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.18...@markuplint/jsx-parser@4.7.19) (2025-04-13)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.18](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.17...@markuplint/jsx-parser@4.7.18) (2025-03-09)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.17](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.16...@markuplint/jsx-parser@4.7.17) (2025-02-27)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.16](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.15...@markuplint/jsx-parser@4.7.16) (2025-02-11)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.15](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.14...@markuplint/jsx-parser@4.7.15) (2025-02-04)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.14](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.13...@markuplint/jsx-parser@4.7.14) (2024-12-04)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.13](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.12...@markuplint/jsx-parser@4.7.13) (2024-11-17)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.12](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.11...@markuplint/jsx-parser@4.7.12) (2024-10-31)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.11](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.10...@markuplint/jsx-parser@4.7.11) (2024-10-28)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.10](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.9...@markuplint/jsx-parser@4.7.10) (2024-10-27)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.9](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.8...@markuplint/jsx-parser@4.7.9) (2024-10-15)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.8](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.7...@markuplint/jsx-parser@4.7.8) (2024-10-14)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.7](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.6...@markuplint/jsx-parser@4.7.7) (2024-09-23)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.6](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.5...@markuplint/jsx-parser@4.7.6) (2024-09-02)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.5](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.4...@markuplint/jsx-parser@4.7.5) (2024-06-25)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.4](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.3...@markuplint/jsx-parser@4.7.4) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.7.3](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.2...@markuplint/jsx-parser@4.7.3) (2024-05-28)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.1...@markuplint/jsx-parser@4.7.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.1-alpha.0...@markuplint/jsx-parser@4.7.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/jsx-parser

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/jsx-parser@4.7.0...@markuplint/jsx-parser@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/jsx-parser
