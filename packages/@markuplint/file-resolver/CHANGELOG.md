# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.7](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.6...v5.0.0-rc.7) (2026-08-31)

### Features

- **file-resolver:** record which overrides globs matched a target file ([c4cba6d](https://github.com/markuplint/markuplint/commit/c4cba6d9444ecb19752204a1655caad0d27f3ff8)), closes [#4023](https://github.com/markuplint/markuplint/issues/4023)

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

### Bug Fixes

- resolveConfig(false) crashes with inline config (not a file path) ([#4018](https://github.com/markuplint/markuplint/issues/4018)) ([7e38b64](https://github.com/markuplint/markuplint/commit/7e38b64caa8cca69009ee765e4aada37fc48c559)), closes [#4015](https://github.com/markuplint/markuplint/issues/4015) [#4015](https://github.com/markuplint/markuplint/issues/4015)

### Performance Improvements

- share ConfigProvider across a run's files, fix latent overrides caching bug ([#4016](https://github.com/markuplint/markuplint/issues/4016)) ([fcc1875](https://github.com/markuplint/markuplint/commit/fcc1875b1a984a5ef1bb36aa04e7b3522fefc58e)), closes [#3997](https://github.com/markuplint/markuplint/issues/3997) [#3997](https://github.com/markuplint/markuplint/issues/3997)

### BREAKING CHANGES

- `ConfigProvider#resolve(targetFile, names, false)` no longer
  clears the provider's store/cache/plugin-resolution caches by itself. Callers
  that relied on `cache: false` alone to force a fresh re-read must now call
  the new `ConfigProvider#invalidate()` first.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **file-resolver:** make generalImport() OS-independent for POSIX absolute paths ([23aa492](https://github.com/markuplint/markuplint/commit/23aa492202a4b305022651210d9fc413e9baef2d)), closes [#3841](https://github.com/markuplint/markuplint/issues/3841) [#3843](https://github.com/markuplint/markuplint/issues/3843) [#3840](https://github.com/markuplint/markuplint/issues/3840)
- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

### Features

- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)

### BREAKING CHANGES

- **rules:** with no alias coverage.

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/file-resolver

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/file-resolver

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

- feat(file-resolver)!: remove deprecated autoLoad parameter from resolveRules ([71cab2d](https://github.com/markuplint/markuplint/commit/71cab2d5fe5bedb3e28b162666cbad3d0a2773ff))

### BREAKING CHANGES

- The autoLoad parameter has been removed from resolveRules().
  Rules are now always auto-loaded unconditionally.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

### Bug Fixes

- **file-resolver:** handle ERR_PACKAGE_PATH_NOT_EXPORTED in generalImport ([d563d60](https://github.com/markuplint/markuplint/commit/d563d6000c4c38be54c17ea015b0f26c80c5229c)), closes [#3516](https://github.com/markuplint/markuplint/issues/3516)
- **file-resolver:** resolve package subpaths before import to avoid runtime-specific errors ([cb2b641](https://github.com/markuplint/markuplint/commit/cb2b641e25cd9de487d395b6f219dd8b60ecd306))

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **file-resolver:** resolve glob results to absolute paths for Windows compatibility ([79a7844](https://github.com/markuplint/markuplint/commit/79a7844823755d886466297f960c3b21f1feec8f))

### Features

- **ml-config,file-resolver:** wire scan field into config pipeline ([76b042a](https://github.com/markuplint/markuplint/commit/76b042a159b4037d3fff4e7c9a5c9be4d6dba44c)), closes [#3335](https://github.com/markuplint/markuplint/issues/3335) [#3336](https://github.com/markuplint/markuplint/issues/3336) [-#3341](https://github.com/-/issues/3341) [#3335](https://github.com/markuplint/markuplint/issues/3335)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/file-resolver

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/file-resolver

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

### Bug Fixes

- **file-resolver:** fix matches() normalization asymmetry and harden tests ([4651df9](https://github.com/markuplint/markuplint/commit/4651df9679427755a3848937b3b8f5546cb04371))
- **file-resolver:** fix Windows path normalization for non-C: drives ([f31a942](https://github.com/markuplint/markuplint/commit/f31a9427fc417f444df26ad1a931d4df5957f29f)), closes [#1806](https://github.com/markuplint/markuplint/issues/1806)
- **file-resolver:** skip platform-specific fromFileURL tests per OS ([4c05356](https://github.com/markuplint/markuplint/commit/4c0535657a748d63f7832efeb3d33b43e5b8e081))

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **file-resolver:** use "options" instead of deprecated "option" in test fixtures ([98a53f2](https://github.com/markuplint/markuplint/commit/98a53f27c4a6e640f20e2c74421c1cdeba3e7db5))

- refactor(file-resolver)!: drop MLMarkupLanguageParser support ([3272ee7](https://github.com/markuplint/markuplint/commit/3272ee72a7c4fb3105fbecd41ec4ba5eff030092))

### Features

- **file-resolver:** add .jsonc config file support via cosmiconfig ([755848d](https://github.com/markuplint/markuplint/commit/755848dbec75105e3cdf9de6becb84546b66deec))

### BREAKING CHANGES

- Remove MLMarkupLanguageParser compatibility from
  resolve-parser. Parser modules must now export MLParserModule
  with a parser property.

* Remove MLMarkupLanguageParser import and union types
* Remove deprecated 'parser' in parserMod check
* Update test mock to use Parser class instance

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.9.18](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.17...@markuplint/file-resolver@4.9.18) (2026-02-10)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.17](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.16...@markuplint/file-resolver@4.9.17) (2025-11-05)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.16](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.15...@markuplint/file-resolver@4.9.16) (2025-08-24)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.15](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.14...@markuplint/file-resolver@4.9.15) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))
- **file-resolver:** change error handling in JSON import and update error message test ([4feb736](https://github.com/markuplint/markuplint/commit/4feb736aac43c339f1a9892f001a84b9e85d3276))
- **file-resolver:** resolve Windows path issue when importing plugins ([33a006a](https://github.com/markuplint/markuplint/commit/33a006abb6f9436f48e6a91640cdc299ba047558))
- resolve import compatibility issues in cosmiconfig ([d2d6413](https://github.com/markuplint/markuplint/commit/d2d6413353641a4c27580a01269c791d1e3d4df0))
- revert toReversed usage for Node.js v18 compatibility ([36b0453](https://github.com/markuplint/markuplint/commit/36b0453a7bf850c035e82c6fccc2f9567a5d4674))

## [4.9.14](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.13...@markuplint/file-resolver@4.9.14) (2025-04-13)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.13](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.12...@markuplint/file-resolver@4.9.13) (2025-03-09)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.12](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.11...@markuplint/file-resolver@4.9.12) (2025-02-27)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.11](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.10...@markuplint/file-resolver@4.9.11) (2025-02-11)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.10](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.9...@markuplint/file-resolver@4.9.10) (2025-02-04)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.9](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.8...@markuplint/file-resolver@4.9.9) (2024-12-04)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.8](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.7...@markuplint/file-resolver@4.9.8) (2024-11-17)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.7](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.6...@markuplint/file-resolver@4.9.7) (2024-10-31)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.6](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.5...@markuplint/file-resolver@4.9.6) (2024-10-28)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.5](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.4...@markuplint/file-resolver@4.9.5) (2024-10-27)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.4](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.3...@markuplint/file-resolver@4.9.4) (2024-10-15)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.3](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.2...@markuplint/file-resolver@4.9.3) (2024-10-14)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.2](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.1...@markuplint/file-resolver@4.9.2) (2024-09-23)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.9.1](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.9.0...@markuplint/file-resolver@4.9.1) (2024-09-02)

**Note:** Version bump only for package @markuplint/file-resolver

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.8.1...@markuplint/file-resolver@4.9.0) (2024-06-25)

### Bug Fixes

- **file-resolver:** catch errors on resolve plugins ([34f4775](https://github.com/markuplint/markuplint/commit/34f47754f2b470c31b9f1215f4072e72b2af6e2a))

### Features

- **file-resolver:** expose errors within resolving plugins ([35ac3d4](https://github.com/markuplint/markuplint/commit/35ac3d46d0aa8e3483defa66c1239e739c57e060))

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.8.0...@markuplint/file-resolver@4.8.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.7.2...@markuplint/file-resolver@4.8.0) (2024-05-28)

### Features

- **file-resolver:** `configProvider` resolves paths of `pretenders` field ([08ccc73](https://github.com/markuplint/markuplint/commit/08ccc7306ac748ce66e33ab571dab1a2eeace12e))
- **file-resolver:** `generalImport` supports to access protected path in module ([6d0c60e](https://github.com/markuplint/markuplint/commit/6d0c60e25d63d31a150a5f2cf7c41bef481302d4))
- **file-resolver:** add `resolve-pretenders` function ([68ba7f5](https://github.com/markuplint/markuplint/commit/68ba7f5acaba13484172bca3ea5f60e0bf3044ef))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.7.1...@markuplint/file-resolver@4.7.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.7.1-alpha.0...@markuplint/file-resolver@4.7.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/file-resolver

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/file-resolver@4.7.0...@markuplint/file-resolver@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/file-resolver
