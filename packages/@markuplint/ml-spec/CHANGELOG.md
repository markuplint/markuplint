# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **ml-spec:** add MathML content model categories and namespace support ([80f0945](https://github.com/markuplint/markuplint/commit/80f0945595aed48c9766423e83e8cd2b1c454a54))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

### Bug Fixes

- **ml-spec:** add transparent traversal fallback in collectLabelText ([d6096c1](https://github.com/markuplint/markuplint/commit/d6096c1ceba190e7799974d0c682695946f852ed))

- feat(ml-spec)!: update default ARIA version to 1.3 ([c3b56e2](https://github.com/markuplint/markuplint/commit/c3b56e2bf06a667a00aa621f2f51a082a90d4e2f))

### BREAKING CHANGES

- The default ARIA specification version used when none
  is explicitly configured changes from 1.2 to 1.3. This may produce
  different lint results for rules that depend on ARIA version.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-spec:** add explicit return type to getContentModel to fix d.ts output ([52724e5](https://github.com/markuplint/markuplint/commit/52724e5f40813b7637862bfe5c7d40f3908113b3))
- **ml-spec:** fix broken getContentModel cache using WeakMap ([4074caa](https://github.com/markuplint/markuplint/commit/4074caa002fed6fd5a8b63da88ea356b544d1f57)), closes [#1022](https://github.com/markuplint/markuplint/issues/1022)
- **ml-spec:** gate context role transparency to ARIA 1.3 only ([0535787](https://github.com/markuplint/markuplint/commit/053578760013f308e6135fb4c482e90e0d983643))
- resolve additional eslint-plugin-unicorn v63 errors ([e58a72c](https://github.com/markuplint/markuplint/commit/e58a72c17c97bbec522f9513b99777fac6904d64))

### Features

- **ml-spec,rules:** adopt ARIA 1.3 property names with 1.2 compat ([4f7e54d](https://github.com/markuplint/markuplint/commit/4f7e54d21593495d36e48fbe8ad27f8be85ab5ef))
- **ml-spec:** add ARIA 1.3 generic role transparency and image/img synonym ([58172f0](https://github.com/markuplint/markuplint/commit/58172f0ed3925bc3d68f5573ff0ba9b158db588b)), closes [#1265](https://github.com/markuplint/markuplint/issues/1265) [#2364](https://github.com/markuplint/markuplint/issues/2364)
- **ml-spec:** add context role validation with caching and transparency ([7a27e0d](https://github.com/markuplint/markuplint/commit/7a27e0d729256919c926b03a11daeeebfd513e4b))
- **ml-spec:** add declarative directivePatterns for parser-less framework support ([ceb9aa6](https://github.com/markuplint/markuplint/commit/ceb9aa67048e3a058b40a9e4d91eb903c8ff1861))
- **ml-spec:** add dpubRoles to ARIASpec type and algorithms ([f88fe77](https://github.com/markuplint/markuplint/commit/f88fe778594e032e003c09396e53e9f64d4772c8)), closes [#1490](https://github.com/markuplint/markuplint/issues/1490)
- **ml-spec:** add useIDLAttributeNames to ExtendedSpec type and merge logic ([ad4f563](https://github.com/markuplint/markuplint/commit/ad4f563a417e3a706f04882252aed2e89fb109c3))

## [4.10.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.10.1...@markuplint/ml-spec@4.10.2) (2026-02-10)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.10.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.10.0...@markuplint/ml-spec@4.10.1) (2025-11-05)

**Note:** Version bump only for package @markuplint/ml-spec

# [4.10.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.7...@markuplint/ml-spec@4.10.0) (2025-08-24)

### Features

- **types:** add link type definitions for specific HTML elements ([7199a8e](https://github.com/markuplint/markuplint/commit/7199a8eb4eaf334855ba78064c4340e040d8614c))

## [4.9.7](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.6...@markuplint/ml-spec@4.9.7) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.9.6](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.5...@markuplint/ml-spec@4.9.6) (2025-04-13)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.9.5](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.4...@markuplint/ml-spec@4.9.5) (2025-03-09)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.9.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.3...@markuplint/ml-spec@4.9.4) (2025-02-27)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.9.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.2...@markuplint/ml-spec@4.9.3) (2025-02-11)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.9.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.1...@markuplint/ml-spec@4.9.2) (2025-02-04)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.9.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.9.0...@markuplint/ml-spec@4.9.1) (2024-12-04)

**Note:** Version bump only for package @markuplint/ml-spec

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.8.2...@markuplint/ml-spec@4.9.0) (2024-11-17)

### Features

- **html-spec:** add `command` and `commandfor` attributes with the `command` event ([19142ab](https://github.com/markuplint/markuplint/commit/19142abe2dbefdf9b333ea43001f7492793cf93e))
- **types:** add `ValidCustomCommand` type for Invoker Command API ([4015eb4](https://github.com/markuplint/markuplint/commit/4015eb404c8a538ea966af114f0676777b7c1eb6))
- **types:** update CSS types ([54864fe](https://github.com/markuplint/markuplint/commit/54864fef43e753e9549f391de19fdf8f3f1d0c86))

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.8.1...@markuplint/ml-spec@4.8.2) (2024-10-31)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.8.0...@markuplint/ml-spec@4.8.1) (2024-10-28)

**Note:** Version bump only for package @markuplint/ml-spec

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.7.2...@markuplint/ml-spec@4.8.0) (2024-10-27)

### Features

- **html-spec:** add the `autocorrect` global attribute ([8035fbd](https://github.com/markuplint/markuplint/commit/8035fbd183c3eb1ab722eb7093a8e5916cf4ba25))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.7.1...@markuplint/ml-spec@4.7.2) (2024-10-15)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.7.0...@markuplint/ml-spec@4.7.1) (2024-10-14)

**Note:** Version bump only for package @markuplint/ml-spec

# [4.7.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.6.4...@markuplint/ml-spec@4.7.0) (2024-09-23)

### Features

- **types:** update types according to CSSTree ([c4d97f9](https://github.com/markuplint/markuplint/commit/c4d97f9571dd2b93462e9dd51c01ecf4f95caf08))

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.6.3...@markuplint/ml-spec@4.6.4) (2024-09-02)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.6.2...@markuplint/ml-spec@4.6.3) (2024-06-25)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.6.1...@markuplint/ml-spec@4.6.2) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.6.0...@markuplint/ml-spec@4.6.1) (2024-05-28)

**Note:** Version bump only for package @markuplint/ml-spec

# [4.6.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.5.1...@markuplint/ml-spec@4.6.0) (2024-05-12)

### Features

- **types:** add `directive` type to schemas ([fc0cc0d](https://github.com/markuplint/markuplint/commit/fc0cc0d5b59c4a24abe8dc78a5bd8ab6cc346f9f))
- **types:** add `JSON` to types ([6dc6e06](https://github.com/markuplint/markuplint/commit/6dc6e0623f596fcf03961167a5acadfd4f627832))

## [4.5.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.5.1-alpha.0...@markuplint/ml-spec@4.5.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-spec

## [4.5.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-spec@4.5.0...@markuplint/ml-spec@4.5.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-spec
