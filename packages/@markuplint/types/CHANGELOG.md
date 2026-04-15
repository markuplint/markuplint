# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **types:** allow empty string for BCP47 type (lang="" is valid per HTML LS) ([ceba672](https://github.com/markuplint/markuplint/commit/ceba6726be6f34200bf54a2808c3eb893f31a032))
- **types:** back-port Pattern type variant to specific-schema source ([6f7466f](https://github.com/markuplint/markuplint/commit/6f7466fc320fa69842f1f7e201a7b637baa58d1a))
- **types:** reject zero and negative srcset descriptors ([5584d20](https://github.com/markuplint/markuplint/commit/5584d2089fe1dfe508d43601fa14aeff4e08b265))
- **types:** use spec-verbatim regex for Email validator ([b517a49](https://github.com/markuplint/markuplint/commit/b517a4926ff213bbbc1eea27583c463b1917b760))

- feat(types)!: remove deprecated Token.getLine and Token.getCol static methods ([fad012c](https://github.com/markuplint/markuplint/commit/fad012c9f1f7e5bb48b79ef639d4cefa61123c1c))

### Features

- **types:** add SimpleColor, Email, and DateTime subtype validators ([1687931](https://github.com/markuplint/markuplint/commit/1687931df058d334797135a925fdf738970ac25a)), closes [#3598](https://github.com/markuplint/markuplint/issues/3598)
- **types:** add SRIHash type for integrity attribute validation ([7672999](https://github.com/markuplint/markuplint/commit/7672999a17f7d96dc286aabfcea5cc0861b73be5))
- **types:** add SRIHash type for integrity attribute validation ([ea30c84](https://github.com/markuplint/markuplint/commit/ea30c84a87025ca5d7284ce5eaad89cc3c802d92))
- **types:** add URL validation with strict checks ([3e64e86](https://github.com/markuplint/markuplint/commit/3e64e86331f92b5914a4107407f9b25233188083))

### BREAKING CHANGES

- Token.getLine() and Token.getCol() have been removed.
  Use Token.getPosition() instead.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **types:** accept BCP 47 private-use tags like x-default ([#718](https://github.com/markuplint/markuplint/issues/718)) ([b335452](https://github.com/markuplint/markuplint/commit/b3354523d0a0686fd029f1e3e81ec3900bc6d4a8))
- **types:** propagate caseInsensitive param in Token array recursion ([2d72f96](https://github.com/markuplint/markuplint/commit/2d72f96774cf733842392ce69700cd31f7783105))
- **types:** reject mixed width and density descriptors in Srcset validator ([00a2ad0](https://github.com/markuplint/markuplint/commit/00a2ad0c5e70d35bc1842476ab54ecf381f6ebcc))
- **types:** use instanceof TypeError for URL validation error handling ([9fd23fa](https://github.com/markuplint/markuplint/commit/9fd23fa4a662bd1394042c89a2c049992fa652c1))
- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))

### Features

- **types:** add Pattern type to Type union for regex validation ([06528bd](https://github.com/markuplint/markuplint/commit/06528bd63a1988ef06f95c17ae63b88f3e699451))
- **types:** export getCandidate function for attribute name suggestion ([100e467](https://github.com/markuplint/markuplint/commit/100e467bdd8bb5acd6075c2d1e12e3e33f5f9090))
- **types:** export link type data arrays and types ([b45937d](https://github.com/markuplint/markuplint/commit/b45937da166f4032262bcd3be1b3338fa6abdb14))

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.8.1...@markuplint/types@4.8.2) (2026-02-10)

**Note:** Version bump only for package @markuplint/types

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.8.0...@markuplint/types@4.8.1) (2025-11-05)

**Note:** Version bump only for package @markuplint/types

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.7...@markuplint/types@4.8.0) (2025-08-24)

### Bug Fixes

- **types:** adjust type checking for css-tree update ([7fff913](https://github.com/markuplint/markuplint/commit/7fff913f4630eab6017861934142636d3c267336))
- **types:** fix bug that spaces are invalid even if separator is 'space' when disallowToSurroundBySpaces is enabled ([3b81c3b](https://github.com/markuplint/markuplint/commit/3b81c3b525cd406275936236f8b793efed8864d7))

### Features

- **types:** add link type definitions for specific HTML elements ([7199a8e](https://github.com/markuplint/markuplint/commit/7199a8eb4eaf334855ba78064c4340e040d8614c))
- **types:** add link type validation for HTML elements ([ed7cc6c](https://github.com/markuplint/markuplint/commit/ed7cc6c2b703e14b8572087eb07c63a97d864187))

## [4.7.7](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.6...@markuplint/types@4.7.7) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.7.6](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.5...@markuplint/types@4.7.6) (2025-04-13)

**Note:** Version bump only for package @markuplint/types

## [4.7.5](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.4...@markuplint/types@4.7.5) (2025-03-09)

**Note:** Version bump only for package @markuplint/types

## [4.7.4](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.3...@markuplint/types@4.7.4) (2025-02-27)

**Note:** Version bump only for package @markuplint/types

## [4.7.3](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.2...@markuplint/types@4.7.3) (2025-02-11)

**Note:** Version bump only for package @markuplint/types

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.1...@markuplint/types@4.7.2) (2025-02-04)

**Note:** Version bump only for package @markuplint/types

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.7.0...@markuplint/types@4.7.1) (2024-12-04)

**Note:** Version bump only for package @markuplint/types

# [4.7.0](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.6.4...@markuplint/types@4.7.0) (2024-11-17)

### Features

- **types:** add `ValidCustomCommand` type for Invoker Command API ([4015eb4](https://github.com/markuplint/markuplint/commit/4015eb404c8a538ea966af114f0676777b7c1eb6))
- **types:** update CSS types ([54864fe](https://github.com/markuplint/markuplint/commit/54864fef43e753e9549f391de19fdf8f3f1d0c86))

## [4.6.4](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.6.3...@markuplint/types@4.6.4) (2024-10-28)

**Note:** Version bump only for package @markuplint/types

## [4.6.3](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.6.2...@markuplint/types@4.6.3) (2024-10-27)

**Note:** Version bump only for package @markuplint/types

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.6.1...@markuplint/types@4.6.2) (2024-10-15)

**Note:** Version bump only for package @markuplint/types

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.6.0...@markuplint/types@4.6.1) (2024-10-14)

**Note:** Version bump only for package @markuplint/types

# [4.6.0](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.5.4...@markuplint/types@4.6.0) (2024-09-23)

### Features

- **types:** avoid parsing and simply accept any value when the CSS includes `var()` ([5817693](https://github.com/markuplint/markuplint/commit/5817693cfcd1a253c627db323505e4b515f69395))
- **types:** update types according to CSSTree ([c4d97f9](https://github.com/markuplint/markuplint/commit/c4d97f9571dd2b93462e9dd51c01ecf4f95caf08))

## [4.5.4](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.5.3...@markuplint/types@4.5.4) (2024-09-02)

**Note:** Version bump only for package @markuplint/types

## [4.5.3](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.5.2...@markuplint/types@4.5.3) (2024-06-25)

**Note:** Version bump only for package @markuplint/types

## [4.5.2](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.5.1...@markuplint/types@4.5.2) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.5.1](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.5.0...@markuplint/types@4.5.1) (2024-05-28)

**Note:** Version bump only for package @markuplint/types

# [4.5.0](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.4.1...@markuplint/types@4.5.0) (2024-05-12)

### Features

- **types:** add `checkDirective` function ([5b9f55b](https://github.com/markuplint/markuplint/commit/5b9f55b9b6255800f1014633c0b2f73da2f49c73))
- **types:** add `directive` type to schemas ([fc0cc0d](https://github.com/markuplint/markuplint/commit/fc0cc0d5b59c4a24abe8dc78a5bd8ab6cc346f9f))
- **types:** add `JSON` to types ([6dc6e06](https://github.com/markuplint/markuplint/commit/6dc6e0623f596fcf03961167a5acadfd4f627832))
- **types:** add directive checking to `check` function ([0dc8d07](https://github.com/markuplint/markuplint/commit/0dc8d0748c9e603282b61308421806e826d5c98f))

## [4.4.1](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.4.1-alpha.0...@markuplint/types@4.4.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/types

## [4.4.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/types@4.4.0...@markuplint/types@4.4.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/types
