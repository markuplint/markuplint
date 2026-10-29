# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.4.0](https://github.com/markuplint/markuplint/compare/v5.3.0...v5.4.0) (2026-10-29)

**Note:** Version bump only for package @markuplint/mdx-parser





# [5.3.0](https://github.com/markuplint/markuplint/compare/v5.2.0...v5.3.0) (2026-10-21)

### Bug Fixes

* make published packages loadable from require() and put types first ([723106f](https://github.com/markuplint/markuplint/commit/723106f51aac4e60dc02db2c1a894617368b0253)), closes [#4198](https://github.com/markuplint/markuplint/issues/4198)
* **mdx-parser:** read a tag whose name starts with `$`, `_` or a non-ASCII letter ([4ecfe45](https://github.com/markuplint/markuplint/commit/4ecfe455a83cb4f0c9ef496964d91c817e03e5c1))

### Features

* **mdx-parser:** answer what a component name is by the rule of JSX ([c29c5af](https://github.com/markuplint/markuplint/commit/c29c5af5455d3253bee0915075f09a49a68b2ebe))
* **mdx-parser:** declare attribute names as case-sensitive ([f5a6f21](https://github.com/markuplint/markuplint/commit/f5a6f214bb229cdb306f0bc49b394b1b32aea283)), closes [#4229](https://github.com/markuplint/markuplint/issues/4229)
* **parser-utils:** let a parser say how an attribute name gets into the DOM ([abd81e5](https://github.com/markuplint/markuplint/commit/abd81e5d20f4ffeb0ba878e77fd4122c1a803a9f))


# [5.2.0](https://github.com/markuplint/markuplint/compare/v5.1.1...v5.2.0) (2026-10-13)

### Bug Fixes

- use caret ranges for third-party dependencies of published packages ([5fb5d2e](https://github.com/markuplint/markuplint/commit/5fb5d2ee81eaeea45fe7256a40dd41c95ff0d672))

## [5.1.1](https://github.com/markuplint/markuplint/compare/v5.1.0...v5.1.1) (2026-10-09)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.1.0](https://github.com/markuplint/markuplint/compare/v5.0.1...v5.1.0) (2026-10-08)

**Note:** Version bump only for package @markuplint/mdx-parser

## [5.0.1](https://github.com/markuplint/markuplint/compare/v5.0.0...v5.0.1) (2026-09-22)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.7...v5.0.0) (2026-09-11)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.7](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.6...v5.0.0-rc.7) (2026-08-31)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

- feat!: adapt framework parsers to UUID-based node references ([6d543b8](https://github.com/markuplint/markuplint/commit/6d543b8c11506fe113d0ceeae3526f552f4ee26d))

### BREAKING CHANGES

- Parser output no longer contains parentNode/pairNode
  object references. Use parentNodeUuid/pairNodeUuid string fields instead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/mdx-parser

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Features

- **mdx-parser:** add MDX parser for markuplint ([a097250](https://github.com/markuplint/markuplint/commit/a0972504aac1317cda5b2e6f0b2f3a1d7bc578fd))
