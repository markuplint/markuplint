# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

### Features

- split rule-deprecation notices out of config-error ([#4013](https://github.com/markuplint/markuplint/issues/4013)) ([812e6f3](https://github.com/markuplint/markuplint/commit/812e6f356839af8f257cfd91e6b16cfdfdd7cf33))

### BREAKING CHANGES

- violations for deprecated rule names now have
  `ruleId: 'rule-deprecation'` instead of `ruleId: 'config-error'`. Any
  consumer filtering `MLCore.verify()` output (or the markuplint CLI/API) by
  `ruleId === 'config-error'` to catch deprecation messages must also check
  for `rule-deprecation`.

- feat(markuplint): add --severity-deprecation CLI flag

Wires the new severity.deprecation config option (@markuplint/ml-config)
and the rule-deprecation ruleId (@markuplint/ml-core) through the CLI:

- --severity-deprecation flag, mirroring --severity-parse-error
- --show-config details now also surfaces ruleDeprecations
- per-run dedupe and failed-file counting generalized to cover both
  config-level ruleIds (config-error and rule-deprecation), not just
  config-error

* docs(website): document severity.deprecation (EN + JA)

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **rules:** surface disallowed-element reason via reasonOnly (close [#3815](https://github.com/markuplint/markuplint/issues/3815)) ([#3986](https://github.com/markuplint/markuplint/issues/3986)) ([0142cec](https://github.com/markuplint/markuplint/commit/0142cec667f70fee086f2a6e06d7a26e66bda380))

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

### Features

- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **ml-config:** accept per-code severity for severity.parseError ([7a0ef81](https://github.com/markuplint/markuplint/commit/7a0ef81443b9d9e004eff153369134bc6d812076)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

### BREAKING CHANGES

- **rules:** with no alias coverage.

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-config

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-config

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/ml-config

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/ml-config

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Features

- **ml-config,file-resolver:** wire scan field into config pipeline ([76b042a](https://github.com/markuplint/markuplint/commit/76b042a159b4037d3fff4e7c9a5c9be4d6dba44c)), closes [#3335](https://github.com/markuplint/markuplint/issues/3335) [#3336](https://github.com/markuplint/markuplint/issues/3336) [-#3341](https://github.com/-/issues/3341) [#3335](https://github.com/markuplint/markuplint/issues/3335)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Features

- **ml-config:** add FixToken type and JSDoc to IRuleFixer methods ([c39d3ce](https://github.com/markuplint/markuplint/commit/c39d3ceaf81ba131d4c1d0efb500d36f327081c4))

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **ml-config:** add autofix type definitions ([d7149c3](https://github.com/markuplint/markuplint/commit/d7149c319fe5f24dc96bfcbd5d83206c0f8e61ed))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/ml-config

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))

### Code Refactoring

- **ml-config:** remove deprecated rule types ([e5d2b2d](https://github.com/markuplint/markuplint/commit/e5d2b2d6b5d7f6a060e1ea2160be97ad3ca02084))

- refactor(ml-config)!: change pretenders merge behavior ([e7b00ab](https://github.com/markuplint/markuplint/commit/e7b00abd80dd75a6060697b30d59d0371ae3694b))
- refactor(ml-config)!: change rule value array merge to override ([05c23ac](https://github.com/markuplint/markuplint/commit/05c23ace31a3429233b3411c8b95ae62438be6e5)), closes [#1104](https://github.com/markuplint/markuplint/issues/1104)
- refactor(ml-config)!: replace deepmerge with shallow merge ([15b4945](https://github.com/markuplint/markuplint/commit/15b494546b9016189a790b2ea49fcc2bb38c85c4))

### Features

- **ml-config:** add name and specConformance properties to nodeRule types ([af53042](https://github.com/markuplint/markuplint/commit/af5304218f7a207a1d8e61464c81c42d5ee1bf01))
- **ml-config:** add named rule group types, merge logic, and type guards ([9f625fd](https://github.com/markuplint/markuplint/commit/9f625fdcd9bc821d2be53668ac0eb676597aa935))
- **ml-config:** add ruleCommonSettings.ariaVersion option ([f2cd713](https://github.com/markuplint/markuplint/commit/f2cd7132311c00c22d68c4685b4a280b77ee6463))

### BREAKING CHANGES

- Pretender files/imports are now overridden instead
  of deep-merged. Pretender data continues to be appended.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Rule value arrays are now overridden instead of
- Object properties in config are now shallow-merged
  instead of deep-merged. Nested objects within parser, specs, etc.
  will be replaced entirely by the overriding config.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- **ml-config:** RuleV2, RuleConfigV2, AnyRuleV2 types are removed.
  The deprecated `option` field is no longer supported; use `options`.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.8.15](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.14...@markuplint/ml-config@4.8.15) (2026-02-10)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.14](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.13...@markuplint/ml-config@4.8.14) (2025-11-05)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.13](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.12...@markuplint/ml-config@4.8.13) (2025-08-24)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.12](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.11...@markuplint/ml-config@4.8.12) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [4.8.11](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.10...@markuplint/ml-config@4.8.11) (2025-04-13)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.10](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.9...@markuplint/ml-config@4.8.10) (2025-03-09)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.9](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.8...@markuplint/ml-config@4.8.9) (2025-02-27)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.8](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.7...@markuplint/ml-config@4.8.8) (2025-02-11)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.7](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.6...@markuplint/ml-config@4.8.7) (2025-02-04)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.6](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.5...@markuplint/ml-config@4.8.6) (2024-12-04)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.5](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.4...@markuplint/ml-config@4.8.5) (2024-11-17)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.3...@markuplint/ml-config@4.8.4) (2024-10-31)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.2...@markuplint/ml-config@4.8.3) (2024-10-28)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.1...@markuplint/ml-config@4.8.2) (2024-10-27)

**Note:** Version bump only for package @markuplint/ml-config

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.8.0...@markuplint/ml-config@4.8.1) (2024-10-15)

**Note:** Version bump only for package @markuplint/ml-config

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.7.4...@markuplint/ml-config@4.8.0) (2024-10-14)

### Features

- **ml-config:** add `severity` option includes `parseError` prop ([8970fb8](https://github.com/markuplint/markuplint/commit/8970fb85aebb0491261c931b66bddc8f3e76cc0f))

## [4.7.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.7.3...@markuplint/ml-config@4.7.4) (2024-09-23)

**Note:** Version bump only for package @markuplint/ml-config

## [4.7.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.7.2...@markuplint/ml-config@4.7.3) (2024-09-02)

**Note:** Version bump only for package @markuplint/ml-config

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.7.1...@markuplint/ml-config@4.7.2) (2024-06-25)

**Note:** Version bump only for package @markuplint/ml-config

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.7.0...@markuplint/ml-config@4.7.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.7.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.6.2...@markuplint/ml-config@4.7.0) (2024-05-28)

### Features

- **ml-config:** `pretenders` field accepts new structure ([3f9f5e8](https://github.com/markuplint/markuplint/commit/3f9f5e8ffdb7fa2526e842559b871ec6414de190))
- **ml-config:** add test for merging `pretenders` structure ([fac00d7](https://github.com/markuplint/markuplint/commit/fac00d7ce4c709757097b8ce8c2e40813af0461c))
- **ml-config:** improve merging for new `pretenders` structure ([fa7d990](https://github.com/markuplint/markuplint/commit/fa7d990c91e7843f6928fd48dc1ff41b7b446402))

## [4.6.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.6.1...@markuplint/ml-config@4.6.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/ml-config

## [4.6.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.6.1-alpha.0...@markuplint/ml-config@4.6.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-config

## [4.6.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-config@4.6.0...@markuplint/ml-config@4.6.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-config
