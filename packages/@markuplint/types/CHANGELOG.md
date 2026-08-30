# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **types): strict charset=utf-8; feat(rules:** usemap-references-map ([#3969](https://github.com/markuplint/markuplint/issues/3969)) ([c63070e](https://github.com/markuplint/markuplint/commit/c63070e29ccb283da7468b2fc67db372ebfcf42a)), closes [#3945](https://github.com/markuplint/markuplint/issues/3945) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3928](https://github.com/markuplint/markuplint/issues/3928)
- **types:** clarify MediaQueryList Stage A vs Stage B responsibility ([6cbb070](https://github.com/markuplint/markuplint/commit/6cbb070822576b2e56f1de5cdb37dbb675755f23))
- **types:** detect IPv4-non-decimal-part validation error in checkURL ([#3972](https://github.com/markuplint/markuplint/issues/3972)) ([c052c25](https://github.com/markuplint/markuplint/commit/c052c25b5a1c247dd9bf071db54c096d6033ed3f)), closes [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966)
- **types:** extend URL forbidden code point detection and fix vtab trim bug ([dbc34be](https://github.com/markuplint/markuplint/commit/dbc34be3ac54ce2a713c7de3e34d62b133e857da)), closes [#3629](https://github.com/markuplint/markuplint/issues/3629)
- **types:** reject duplicate descriptors in Srcset checker ([5ff8641](https://github.com/markuplint/markuplint/commit/5ff8641c915cb0c5d0790c0908371156107ddbc6))
- **types:** reject standalone "webauthn" in checkAutoComplete ([84c8a3b](https://github.com/markuplint/markuplint/commit/84c8a3b7b71961636e0f0011edef5396b8cf5e2f))
- **types:** reject unterminated quoted-string in MIME type parameters ([741b41c](https://github.com/markuplint/markuplint/commit/741b41c275cb81eb51f88605f3fa4a297619ff80)), closes [#3851](https://github.com/markuplint/markuplint/issues/3851) [#3851](https://github.com/markuplint/markuplint/issues/3851)
- **types:** rename HashName test fixture "mymap" to "my-map" for cspell ([08d5796](https://github.com/markuplint/markuplint/commit/08d57965d726bc7d5bb8713da85c235ddcc9f475))
- **types:** require non-empty name in HashName type ([af494fb](https://github.com/markuplint/markuplint/commit/af494fb2092c4f7a9ebf3279a9239b4fe1bddbd9))
- **types:** spelling — unparseable → unparsable in AbsoluteURL comment ([7c7a7d7](https://github.com/markuplint/markuplint/commit/7c7a7d7873dbbfe60d8b4d98e0d6af7278fcb0d9))
- **types:** tighten MediaQueryList negative-value & fatal-error guards ([c185ea6](https://github.com/markuplint/markuplint/commit/c185ea60e7095b28338edca9652d78fe3dc2d33f)), closes [#3866](https://github.com/markuplint/markuplint/issues/3866)
- **types:** tighten Srcset URL and SourceSizeList numeric bounds ([3b122aa](https://github.com/markuplint/markuplint/commit/3b122aaf6ddbe3a8b797d02978108d842119030e))

### Features

- **types:** add DateStringWithOptionalTime and tighten global date and time fraction separator ([95cf050](https://github.com/markuplint/markuplint/commit/95cf0504285ba04dbdb8bdf5addd03bac06396f7))
- **types:** add HTTPEquivRefresh and HTTPEquivContentType validators ([649a259](https://github.com/markuplint/markuplint/commit/649a2591825c87c7993fcd0f5b667cf6d8cafa92)), closes [#3734](https://github.com/markuplint/markuplint/issues/3734) [#3734](https://github.com/markuplint/markuplint/issues/3734)
- **types:** add MediaQueryList typed checker for media= attribute validation ([b5bc19a](https://github.com/markuplint/markuplint/commit/b5bc19a806d39099e0b62d2eacae882456bd3c3e)), closes [#3850](https://github.com/markuplint/markuplint/issues/3850)
- **types:** catch URL Living Standard validation errors in URL type checker ([289932d](https://github.com/markuplint/markuplint/commit/289932df8e5f11dc4c60116843e4c31bd8be6e63)), closes [#3848](https://github.com/markuplint/markuplint/issues/3848)
- **types:** enforce element-context autocomplete constraints (select webauthn, input[type=hidden] on/off) ([#3930](https://github.com/markuplint/markuplint/issues/3930)) ([dc51d46](https://github.com/markuplint/markuplint/commit/dc51d460731541c963c9aa8bdf407c20974dced4))
- **types:** expand URL Living Standard coverage and add per-attribute URL variants ([b577b2c](https://github.com/markuplint/markuplint/commit/b577b2c4aa8e3ee31a368f62c2108e63aa457628)), closes [#3868](https://github.com/markuplint/markuplint/issues/3868)
- **types:** reject general-enclosed matches in MediaQueryList and SourceSizeList ([#3934](https://github.com/markuplint/markuplint/issues/3934)) ([2fc8615](https://github.com/markuplint/markuplint/commit/2fc8615c475540d4e5b85661baa1491d791cb661))
- **types:** validate BCP 47 language tags against the IANA subtag registry ([#3973](https://github.com/markuplint/markuplint/issues/3973)) ([cb8ea69](https://github.com/markuplint/markuplint/commit/cb8ea69bd1b7eb35b4b5507183f8da01edb161c5)), closes [#3829](https://github.com/markuplint/markuplint/issues/3829) [#3829](https://github.com/markuplint/markuplint/issues/3829) [#3829](https://github.com/markuplint/markuplint/issues/3829)
- **types:** validate CSP3 grammar for meta[content][http-equiv=content-security-policy] ([#3982](https://github.com/markuplint/markuplint/issues/3982)) ([b2d1d84](https://github.com/markuplint/markuplint/commit/b2d1d84ea92c754fe2dbf54950ae8fdb74fe51eb)), closes [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3946](https://github.com/markuplint/markuplint/issues/3946)
- **types:** validate media feature value types per Media Queries Level 5 §4 ([d231374](https://github.com/markuplint/markuplint/commit/d231374ad6ae2c77dc9dbb5b5b403581f5d3738c))

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/types

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/types

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
