# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

- feat!: adapt framework parsers to UUID-based node references ([6d543b8](https://github.com/markuplint/markuplint/commit/6d543b8c11506fe113d0ceeae3526f552f4ee26d))

### Features

- **svelte-parser:** add component-scanner subpath export for pretenders auto scan ([fc8db17](https://github.com/markuplint/markuplint/commit/fc8db17ec40af73911d52ec9b03ca9143b115315))

### BREAKING CHANGES

- Parser output no longer contains parentNode/pairNode
  object references. Use parentNodeUuid/pairNodeUuid string fields instead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/svelte-parser

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- disable unicorn/no-array-sort rule and fix no-immediate-mutation ([bf76be2](https://github.com/markuplint/markuplint/commit/bf76be26478aa2a03528f9182cb11d123b44db44))
- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))
- **svelte-parser:** map IDL attribute names to content attribute names ([3e5006f](https://github.com/markuplint/markuplint/commit/3e5006f2b9f6dd5ca3af3c8727439d9ab04d696b))

- refactor(svelte-parser)!: use blockBehavior and simplified tokens ([7342981](https://github.com/markuplint/markuplint/commit/734298138b1d56685499415db397be7136fcb75d))

### BREAKING CHANGES

- Replace conditionalType with blockBehavior objects
  containing type and expression fields. Update token property
  access from startOffset to offset in parse-block.ts.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.7.13](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.12...@markuplint/svelte-parser@4.7.13) (2026-02-10)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.12](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.11...@markuplint/svelte-parser@4.7.12) (2025-11-05)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.11](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.10...@markuplint/svelte-parser@4.7.11) (2025-08-24)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.10](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.9...@markuplint/svelte-parser@4.7.10) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.7.9](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.8...@markuplint/svelte-parser@4.7.9) (2025-04-13)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.8](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.7...@markuplint/svelte-parser@4.7.8) (2025-03-09)

### Bug Fixes

- **svelte-parser:** handle script tag with lang attribute in svelte parser ([c4986a4](https://github.com/markuplint/markuplint/commit/c4986a4f961816826fc0cae6278d046fa92ef86c)), closes [#2505](https://github.com/markuplint/markuplint/issues/2505)

## [4.7.7](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.6...@markuplint/svelte-parser@4.7.7) (2025-02-27)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.6](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.5...@markuplint/svelte-parser@4.7.6) (2025-02-11)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.5](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.4...@markuplint/svelte-parser@4.7.5) (2025-02-04)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.4](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.3...@markuplint/svelte-parser@4.7.4) (2024-12-04)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.3](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.2...@markuplint/svelte-parser@4.7.3) (2024-11-17)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.1...@markuplint/svelte-parser@4.7.2) (2024-10-31)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.7.0...@markuplint/svelte-parser@4.7.1) (2024-10-28)

**Note:** Version bump only for package @markuplint/svelte-parser

# [4.7.0](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.9...@markuplint/svelte-parser@4.7.0) (2024-10-27)

### Features

- **svelte-parser:** use new modern parser of Svelte ([3967060](https://github.com/markuplint/markuplint/commit/3967060a437af78515d5cfb8ec54905e9680ac7e))

## [4.6.9](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.8...@markuplint/svelte-parser@4.6.9) (2024-10-15)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.8](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.7...@markuplint/svelte-parser@4.6.8) (2024-10-14)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.7](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.6...@markuplint/svelte-parser@4.6.7) (2024-09-23)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.6](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.5...@markuplint/svelte-parser@4.6.6) (2024-09-02)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.5](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.4...@markuplint/svelte-parser@4.6.5) (2024-06-25)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.3...@markuplint/svelte-parser@4.6.4) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.2...@markuplint/svelte-parser@4.6.3) (2024-05-28)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.1...@markuplint/svelte-parser@4.6.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.1-alpha.0...@markuplint/svelte-parser@4.6.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/svelte-parser

## [4.6.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/svelte-parser@4.6.0...@markuplint/svelte-parser@4.6.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/svelte-parser
