# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

### Bug Fixes

- add no-aria-hidden-on-hidden-until-found rule (closes [#3999](https://github.com/markuplint/markuplint/issues/3999)) ([#4017](https://github.com/markuplint/markuplint/issues/4017)) ([3dfb300](https://github.com/markuplint/markuplint/commit/3dfb3001dc66452918d5cebbb071244b68779b30))

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **rules:** surface disallowed-element reason via reasonOnly (close [#3815](https://github.com/markuplint/markuplint/issues/3815)) ([#3986](https://github.com/markuplint/markuplint/issues/3986)) ([0142cec](https://github.com/markuplint/markuplint/commit/0142cec667f70fee086f2a6e06d7a26e66bda380))
- **types): strict charset=utf-8; feat(rules:** usemap-references-map ([#3969](https://github.com/markuplint/markuplint/issues/3969)) ([c63070e](https://github.com/markuplint/markuplint/commit/c63070e29ccb283da7468b2fc67db372ebfcf42a)), closes [#3945](https://github.com/markuplint/markuplint/issues/3945) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3928](https://github.com/markuplint/markuplint/issues/3928)

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

- fix(config-presets)!: enable invalid-attr in html-standard, simplify rdfa nodeRule (#3803) ([2114933](https://github.com/markuplint/markuplint/commit/2114933f90640110baf8dcc85f34cab73b412bdf)), closes [#3803](https://github.com/markuplint/markuplint/issues/3803)

### Features

- **config-presets:** add 6 new conformance rules to html-standard preset ([595e3b9](https://github.com/markuplint/markuplint/commit/595e3b91a2e4c8c33a8fd1c9d179b3a9dc8be054))
- **config-presets:** forbid <base> after <link> or <script> in <head> ([#3925](https://github.com/markuplint/markuplint/issues/3925)) ([ceb892d](https://github.com/markuplint/markuplint/commit/ceb892d64772d459a6bd9564684218e3afbdec2e))
- **config-presets:** wire form-attr-references-form + no-refer-to-non-existent-id ([8fad30f](https://github.com/markuplint/markuplint/commit/8fad30f79b679f5581f368de1f187cfad4870731))
- **rules:** add input-list-references-datalist rule ([#3931](https://github.com/markuplint/markuplint/issues/3931)) ([bf4ef54](https://github.com/markuplint/markuplint/commit/bf4ef54a1b2937ecbe05fbe5121ddfe199781a95))
- **rules:** add label-for-references-labelable rule ([#3932](https://github.com/markuplint/markuplint/issues/3932)) ([3713e6b](https://github.com/markuplint/markuplint/commit/3713e6b435a76fe03a941a36a5e33c0ab06c9a80)), closes [#3918](https://github.com/markuplint/markuplint/issues/3918)
- **rules:** add progress-value-bounds rule ([#3926](https://github.com/markuplint/markuplint/issues/3926)) ([1e259ec](https://github.com/markuplint/markuplint/commit/1e259ec9929ceb3c7ac5864ce2807420646e9602))
- **rules:** add wai-aria-tab-requires-tabpanel rule ([#3955](https://github.com/markuplint/markuplint/issues/3955)) ([eac9abe](https://github.com/markuplint/markuplint/commit/eac9abef20ef304c3da2114849686b9cf0733942))
- **rules:** extend label-no-multiple-controls for external labeled control ([#3933](https://github.com/markuplint/markuplint/issues/3933)) ([392f051](https://github.com/markuplint/markuplint/commit/392f051c0d7ee8be8f3dc12afae6a902c6c8ea2b))
- **rules:** surface parse5-silent HTML LS parse errors (close nu-only umbrella [#3943](https://github.com/markuplint/markuplint/issues/3943)) ([#3980](https://github.com/markuplint/markuplint/issues/3980)) ([89951fa](https://github.com/markuplint/markuplint/commit/89951fa274007d56370510cb0cf11aead808ce13))
- wire script-content into preset, bench, and default-rules ([dd0507a](https://github.com/markuplint/markuplint/commit/dd0507a9f54fcff25dba666a1c8fbc082489bdc8))

### BREAKING CHANGES

- **rules:** with no alias coverage.
- `markuplint:html-standard` now enables the base `invalid-attr` rule.
  `rdfa/meta-property` is no longer a named rule — override behavior is preserved by
  the unnamed nodeRule. Users who disabled this named rule via
  `rules: { "rdfa/meta-property": false }` should remove that entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Features

- **config-presets:** add document uniqueness rules to html-standard preset ([6ed848b](https://github.com/markuplint/markuplint/commit/6ed848bd800416d1220b9de95ece7a3d752d881f))
- **config-presets:** split a11y/wai-aria into 16 namedRuleGroup entries ([7ab707b](https://github.com/markuplint/markuplint/commit/7ab707b4ae1c1843a0576d31bf3fb20f0f5f7686))
- **html-spec:** use #nonEmptyText for title and option elements ([ede5d4c](https://github.com/markuplint/markuplint/commit/ede5d4c87c72b7e2e95f17799f3632eb9108feef))

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/config-presets

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **config-presets:** scope tabindex allowAttrs to non-dialog elements ([faa327d](https://github.com/markuplint/markuplint/commit/faa327db131f123dd0ecca8fc76db3d576541597))
- resolve additional eslint-plugin-unicorn v63 errors ([e58a72c](https://github.com/markuplint/markuplint/commit/e58a72c17c97bbec522f9513b99777fac6904d64))

### Features

- **config-presets:** add compat preset and extend recommended ([c306134](https://github.com/markuplint/markuplint/commit/c3061348f1d8034f5b7b6ebad630fd9b1f8edef8))
- **config-presets:** add link-types rule to html-standard preset ([5e4a4d0](https://github.com/markuplint/markuplint/commit/5e4a4d01211a7bdbd08f20e76d83d9e052ceace0))
- **config-presets:** add named nodeRules and specConformance to presets ([c94e82f](https://github.com/markuplint/markuplint/commit/c94e82f226ceffbd89b12fcd04e7ee556f8c4063))
- **config-presets:** add named rule groups and specConformance to all presets ([1ef5d58](https://github.com/markuplint/markuplint/commit/1ef5d58dfbc0a02e6574448fa58b419115baceb2))
- **config-presets:** add no-shortcut-icon rule to html-standard preset ([6420fbc](https://github.com/markuplint/markuplint/commit/6420fbc5728ffe5a79b50e7694ddf93d00c01b50)), closes [#715](https://github.com/markuplint/markuplint/issues/715)
- **config-presets:** add redundant-accessible-name rule to a11y preset ([8c66b37](https://github.com/markuplint/markuplint/commit/8c66b37714abfa3f0a0c95564f703e00f963ca7c))
- **config-presets:** add srcset-sizes-constraint to html-standard preset ([9a3f564](https://github.com/markuplint/markuplint/commit/9a3f5643a9f0bfe0f437ab6f4415f6e5d35a0847))
- **config-presets:** disallow user-scalable=no in viewport meta for a11y preset ([9703c79](https://github.com/markuplint/markuplint/commit/9703c791fa220dc28698e3d7a27c19e716de21de))
- **rules:** add require-dialog-autofocus rule ([2d8d650](https://github.com/markuplint/markuplint/commit/2d8d650f8bc82e706687d292b27c310f3552b418)), closes [#689](https://github.com/markuplint/markuplint/issues/689)

## [4.5.14](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.13...@markuplint/config-presets@4.5.14) (2026-02-10)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.13](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.12...@markuplint/config-presets@4.5.13) (2025-08-13)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.12](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.11...@markuplint/config-presets@4.5.12) (2025-02-11)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.11](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.10...@markuplint/config-presets@4.5.11) (2025-02-04)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.10](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.9...@markuplint/config-presets@4.5.10) (2024-10-28)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.9](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.8...@markuplint/config-presets@4.5.9) (2024-10-27)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.8](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.7...@markuplint/config-presets@4.5.8) (2024-10-15)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.7](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.6...@markuplint/config-presets@4.5.7) (2024-10-14)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.6](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.5...@markuplint/config-presets@4.5.6) (2024-09-23)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.5](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.4...@markuplint/config-presets@4.5.5) (2024-09-02)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.4](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.3...@markuplint/config-presets@4.5.4) (2024-06-25)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.3](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.2...@markuplint/config-presets@4.5.3) (2024-06-09)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.2](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.1...@markuplint/config-presets@4.5.2) (2024-05-28)

**Note:** Version bump only for package @markuplint/config-presets

## [4.5.1](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.0...@markuplint/config-presets@4.5.1) (2024-05-12)

**Note:** Version bump only for package @markuplint/config-presets

# [4.5.0](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.5.0-alpha.0...@markuplint/config-presets@4.5.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/config-presets

# [4.5.0-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/config-presets@4.4.0...@markuplint/config-presets@4.5.0-alpha.0) (2024-05-04)

### Features

- **presets:** add `table-row-column-alignment` to presets ([7dae88b](https://github.com/markuplint/markuplint/commit/7dae88b48b81be589b32a475870e6b6a277ef775))
- **rules:** apply `no-ambiguous-navigable-target-names` to build-in rules ([93d34f0](https://github.com/markuplint/markuplint/commit/93d34f0ead2624107a5b6f315af0c8bbd4f1e1ec))
