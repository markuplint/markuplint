# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **markuplint:** report post-fix violations for exit code and suppressions ([03855d6](https://github.com/markuplint/markuplint/commit/03855d6641ae736b65994fa6123e91779d2eb41e)), closes [#3890](https://github.com/markuplint/markuplint/issues/3890)
- **markuplint:** stop repeating config-error messages once per file ([#4007](https://github.com/markuplint/markuplint/issues/4007)) ([466193d](https://github.com/markuplint/markuplint/commit/466193d286628f69e0d99fc8b2f66028523025aa)), closes [#4006](https://github.com/markuplint/markuplint/issues/4006)
- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **rules:** surface disallowed-element reason via reasonOnly (close [#3815](https://github.com/markuplint/markuplint/issues/3815)) ([#3986](https://github.com/markuplint/markuplint/issues/3986)) ([0142cec](https://github.com/markuplint/markuplint/commit/0142cec667f70fee086f2a6e06d7a26e66bda380))
- **types): strict charset=utf-8; feat(rules:** usemap-references-map ([#3969](https://github.com/markuplint/markuplint/issues/3969)) ([c63070e](https://github.com/markuplint/markuplint/commit/c63070e29ccb283da7468b2fc67db372ebfcf42a)), closes [#3945](https://github.com/markuplint/markuplint/issues/3945) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3928](https://github.com/markuplint/markuplint/issues/3928)

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

- feat(markuplint)!: stop forcing severity.parseError default in CLI ([79ff00b](https://github.com/markuplint/markuplint/commit/79ff00b5d068802f4d7e0d8d30ee63e55b8bc7f1)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

### Features

- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **config-presets:** forbid <base> after <link> or <script> in <head> ([#3925](https://github.com/markuplint/markuplint/issues/3925)) ([ceb892d](https://github.com/markuplint/markuplint/commit/ceb892d64772d459a6bd9564684218e3afbdec2e))
- **rules:** add form-attr-references-form rule ([6b541f0](https://github.com/markuplint/markuplint/commit/6b541f032b76c3712c99ea35596b6b0aa79b6137))
- **rules:** add input-button-non-empty-value rule ([2cc73dd](https://github.com/markuplint/markuplint/commit/2cc73ddd0f874fae9faf005f498d73fa364b682c))
- **rules:** add input-file-empty-value rule ([228cbd7](https://github.com/markuplint/markuplint/commit/228cbd752956d3df8f525e4f19f9278a44d87160))
- **rules:** add input-list-references-datalist rule ([#3931](https://github.com/markuplint/markuplint/issues/3931)) ([bf4ef54](https://github.com/markuplint/markuplint/commit/bf4ef54a1b2937ecbe05fbe5121ddfe199781a95))
- **rules:** add label-for-references-labelable rule ([#3932](https://github.com/markuplint/markuplint/issues/3932)) ([3713e6b](https://github.com/markuplint/markuplint/commit/3713e6b435a76fe03a941a36a5e33c0ab06c9a80)), closes [#3918](https://github.com/markuplint/markuplint/issues/3918)
- **rules:** add label-no-multiple-controls rule ([5da3f85](https://github.com/markuplint/markuplint/commit/5da3f8523dd6ffd9f44ea73d9012952aad85d821))
- **rules:** add map-id-name-match rule ([1472daf](https://github.com/markuplint/markuplint/commit/1472daf62470bf56c4cb326ab47dc43ba87a8cb3))
- **rules:** add no-extra-selected-options rule ([3ea75ac](https://github.com/markuplint/markuplint/commit/3ea75ac0b6850c36d5419924b18c1002dfb864a9))
- **rules:** add progress-value-bounds rule ([#3926](https://github.com/markuplint/markuplint/issues/3926)) ([1e259ec](https://github.com/markuplint/markuplint/commit/1e259ec9929ceb3c7ac5864ce2807420646e9602))
- **rules:** add wai-aria-tab-requires-tabpanel rule ([#3955](https://github.com/markuplint/markuplint/issues/3955)) ([eac9abe](https://github.com/markuplint/markuplint/commit/eac9abef20ef304c3da2114849686b9cf0733942))
- **rules:** surface parse5-silent HTML LS parse errors (close nu-only umbrella [#3943](https://github.com/markuplint/markuplint/issues/3943)) ([#3980](https://github.com/markuplint/markuplint/issues/3980)) ([89951fa](https://github.com/markuplint/markuplint/commit/89951fa274007d56370510cb0cf11aead808ce13))
- wire script-content into preset, bench, and default-rules ([dd0507a](https://github.com/markuplint/markuplint/commit/dd0507a9f54fcff25dba666a1c8fbc082489bdc8))

### BREAKING CHANGES

- **rules:** with no alias coverage.
- CLI invocations that previously relied on the implicit
  \`severity.parseError: 'error'\` default for _fatal_ parser errors are
  unaffected — fatal errors continue to emit at \`'error'\` regardless. But
  projects that lint malformed HTML and expected non-fatal parse5 events to
  show up by default must now pass \`--severity-parse-error error\` (or set
  \`severity.parseError\` in their config).

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package markuplint

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package markuplint

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **markuplint:** add default export condition and re-export isFatalError ([55a990a](https://github.com/markuplint/markuplint/commit/55a990affeec62c23a96cf15b42327fcb867e809))
- **markuplint:** add missing status property to github-reporter test data ([bb7ba62](https://github.com/markuplint/markuplint/commit/bb7ba62e9350c173987f76de2741aaeb3ba0997b))

- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))
- feat(markuplint)!: remove deprecated autoLoad option and MLResultInfo_v1 interface ([4eb1d05](https://github.com/markuplint/markuplint/commit/4eb1d05eb2829019cd4073afa153a512b1c4c8fa))

### Features

- **config-presets:** add document uniqueness rules to html-standard preset ([6ed848b](https://github.com/markuplint/markuplint/commit/6ed848bd800416d1220b9de95ece7a3d752d881f))
- **markuplint:** add CLI summary output ([4743ba0](https://github.com/markuplint/markuplint/commit/4743ba0be7311288ea2b28fb9345567cf97c1a23))
- **markuplint:** add suppressions subpath export and editor severity downgrade ([362adef](https://github.com/markuplint/markuplint/commit/362adef1a040c66fec36c01bd8d8fcbe9a66c453))
- **vscode:** add suppressed message prefix and blame parser tests ([cd80a80](https://github.com/markuplint/markuplint/commit/cd80a802c3bad29a8a1d510d2160a21a6f0a2682))

### BREAKING CHANGES

- ESLint is no longer used. Use oxlint instead.
- The autoLoad option has been removed from APIOptions.
  Rules are now always auto-loaded unconditionally.
  The MLResultInfo_v1 interface has also been removed.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

### Bug Fixes

- add isFatalError guard to MLEngine.exec and fix accname Deno crash ([c4b20de](https://github.com/markuplint/markuplint/commit/c4b20de128b2cfee582b3588e5004cb90065825b))
- **markuplint:** use platform-native paths in suppressions round-trip test ([df4b6a5](https://github.com/markuplint/markuplint/commit/df4b6a5f83b0fed3f74afba72cccd7bc2dbf8606))

### Features

- **markuplint:** add experimental bulk suppressions ([bd3ab72](https://github.com/markuplint/markuplint/commit/bd3ab7204870dd6061e8e4ccbeaacd751d069a73)), closes [#3503](https://github.com/markuplint/markuplint/issues/3503)
- **markuplint:** add selector scope (LCA) to bulk suppressions ([84cf73d](https://github.com/markuplint/markuplint/commit/84cf73dd92db49f1f93ff6a5c9b71c7807ce31e9)), closes [#3509](https://github.com/markuplint/markuplint/issues/3509)

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **markuplint:** guard Error.stack access for Deno source map compat ([40508a3](https://github.com/markuplint/markuplint/commit/40508a3e25a9ed84f84f63adc95cc524628b9468))

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Features

- **markuplint:** add --fix-dry-run CLI flag and fix summary passthrough ([ecd4550](https://github.com/markuplint/markuplint/commit/ecd455042d732f950b16ca79c283bd95dc3c2a72))
- **markuplint:** add fixSummary to lint event and fixable test fixtures ([287a8be](https://github.com/markuplint/markuplint/commit/287a8be7d96e121115e357f1696314dd6b0f1a1c))
- **markuplint:** display specConformance in CLI reporters ([aaae2de](https://github.com/markuplint/markuplint/commit/aaae2de8166d6b6151f7c397ba7cd99d4a867442))

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **markuplint:** integrate autofix results into MLEngine ([1558a5c](https://github.com/markuplint/markuplint/commit/1558a5cbdddda6845cf2570252920f5c489a6acc))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package markuplint

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **markuplint:** remove async from i18n since os-locale v8 is sync ([3d1f4a6](https://github.com/markuplint/markuplint/commit/3d1f4a68afd2c2a2eac286710d9874dec492c326))
- **markuplint:** set LANG=en in allow warnings test for CI compatibility ([5d4ea00](https://github.com/markuplint/markuplint/commit/5d4ea003e8153e481b9501b18253757a4b891267))
- **markuplint:** update os-locale from v6 to v8 ([f10d128](https://github.com/markuplint/markuplint/commit/f10d1280b9dec56ff34fe0d27065f69a61d9231d))

- feat!: stop loading default config when --config is specified (#1862) ([1b8aa71](https://github.com/markuplint/markuplint/commit/1b8aa710bad65fa626e55a0ebae80d591b915e31)), closes [#1862](https://github.com/markuplint/markuplint/issues/1862)
- feat!: remove deprecated v1 API ([f8999ae](https://github.com/markuplint/markuplint/commit/f8999aecc8e05c3ba2022a93698c87b01bbd573b))
- feat(markuplint)!: wire ruleCommonSettings and set allowWarnings default to true ([79524a4](https://github.com/markuplint/markuplint/commit/79524a407f1bf5015c700d11599c4caca0d3a33d))

### Features

- delete htmx-parser, simplify alpine-parser, add migration guide and tests ([f8dbb09](https://github.com/markuplint/markuplint/commit/f8dbb090707d8cfbf3d859a9b868b2087064f89b))
- **markuplint:** display virtual rule names in reporters ([39a0473](https://github.com/markuplint/markuplint/commit/39a04737926d254d72082a1091b931c72b68cbc6))
- **rules:** add redundant-accessible-name rule for detecting overridden accessible name sources ([63b89d4](https://github.com/markuplint/markuplint/commit/63b89d47bf5056f823d5b27cda4fda2b96419bb3))

### BREAKING CHANGES

- `--config` no longer merges with auto-discovered config files.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- The `exec` export (v1 API) has been removed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- --allow-warnings now defaults to true. Use --no-allow-warnings
  to restore the previous behavior of returning exit code 1 when warnings exist.

## [4.14.1](https://github.com/markuplint/markuplint/compare/markuplint@4.14.0...markuplint@4.14.1) (2026-02-10)

**Note:** Version bump only for package markuplint

# [4.14.0](https://github.com/markuplint/markuplint/compare/markuplint@4.13.1...markuplint@4.14.0) (2025-11-05)

### Features

- **markuplint:** add progressive output option for CLI ([9cbfa69](https://github.com/markuplint/markuplint/commit/9cbfa69d1acbcb123b7b83a91cdbaf9a97f6c3d7))

## [4.13.1](https://github.com/markuplint/markuplint/compare/markuplint@4.13.0...markuplint@4.13.1) (2025-08-24)

**Note:** Version bump only for package markuplint

# [Unreleased](https://github.com/markuplint/markuplint/compare/markuplint@4.13.0...HEAD)

### Features

- **markuplint:** add --progressive-output option for CLI ([9cbfa69](https://github.com/markuplint/markuplint/commit/9cbfa69d1))

# [4.13.0](https://github.com/markuplint/markuplint/compare/markuplint@4.12.0...markuplint@4.13.0) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))
- **markuplint:** remove duplicate test for cross-platform compatibility ([d7af614](https://github.com/markuplint/markuplint/commit/d7af6142892a1b4ba4ae196e53df4480817044ff))

### Features

- **markuplint:** add --max-violations CLI option ([3ec868d](https://github.com/markuplint/markuplint/commit/3ec868d5e666993a6220a352081100947c31f999))
- **markuplint:** add --max-warnings option for incremental adoption ([b14513d](https://github.com/markuplint/markuplint/commit/b14513d952b3c47330aba2ce8c4b31714bbc1625)), closes [#2523](https://github.com/markuplint/markuplint/issues/2523)
- **markuplint:** add maxViolations support to API layer ([cb6d577](https://github.com/markuplint/markuplint/commit/cb6d577483a38e32a378d89a13e950c0eb311b09))
- **markuplint:** add skip status display to reporters ([5c1f189](https://github.com/markuplint/markuplint/commit/5c1f1897c76b42fc97fce4ce2edd75dd31470abd))
- **markuplint:** add status field to MLResultInfo and simplify verification ([56deb99](https://github.com/markuplint/markuplint/commit/56deb999a330bb7d91333dc464a034cbc6010479))
- **markuplint:** add truncation info message to standard reporter ([9c9a21d](https://github.com/markuplint/markuplint/commit/9c9a21dcc01b391a68d23cc315254b69039d9afc))
- **markuplint:** implement max-count option with skip status tracking ([20ca12d](https://github.com/markuplint/markuplint/commit/20ca12d391bcf8f09eae4c8786ba688ef7192506))

# [4.12.0](https://github.com/markuplint/markuplint/compare/markuplint@4.11.8...markuplint@4.12.0) (2025-04-13)

### Features

- clarify CLI messages in `markuplint --init` ([d2f1dce](https://github.com/markuplint/markuplint/commit/d2f1dce1575d33e736ba550f0bc3a999665e95dc))

## [4.11.8](https://github.com/markuplint/markuplint/compare/markuplint@4.11.7...markuplint@4.11.8) (2025-03-09)

**Note:** Version bump only for package markuplint

## [4.11.7](https://github.com/markuplint/markuplint/compare/markuplint@4.11.6...markuplint@4.11.7) (2025-02-27)

**Note:** Version bump only for package markuplint

## [4.11.6](https://github.com/markuplint/markuplint/compare/markuplint@4.11.5...markuplint@4.11.6) (2025-02-11)

**Note:** Version bump only for package markuplint

## [4.11.5](https://github.com/markuplint/markuplint/compare/markuplint@4.11.4...markuplint@4.11.5) (2025-02-04)

### Bug Fixes

- **markuplint:** fix default options of the `mlRuleTest` ([3d85bfd](https://github.com/markuplint/markuplint/commit/3d85bfdb5cc1a121797613d76f02757b1816072d))

## [4.11.4](https://github.com/markuplint/markuplint/compare/markuplint@4.11.3...markuplint@4.11.4) (2024-12-04)

**Note:** Version bump only for package markuplint

## [4.11.3](https://github.com/markuplint/markuplint/compare/markuplint@4.11.2...markuplint@4.11.3) (2024-11-17)

**Note:** Version bump only for package markuplint

## [4.11.2](https://github.com/markuplint/markuplint/compare/markuplint@4.11.1...markuplint@4.11.2) (2024-10-31)

**Note:** Version bump only for package markuplint

## [4.11.1](https://github.com/markuplint/markuplint/compare/markuplint@4.11.0...markuplint@4.11.1) (2024-10-28)

**Note:** Version bump only for package markuplint

# [4.11.0](https://github.com/markuplint/markuplint/compare/markuplint@4.10.1...markuplint@4.11.0) (2024-10-27)

### Bug Fixes

- **markuplint:** remove unnecessary a comma ([dc49a54](https://github.com/markuplint/markuplint/commit/dc49a54359a25ca200edd3928f03ed3ca1f1fe41))

### Features

- **markuplint:** add `--show-config` option to CLI ([a836ddb](https://github.com/markuplint/markuplint/commit/a836ddb50159ec45ac4fc0ced9ca1c66a10c90c1))
- **markuplint:** change `resolveConfig` method to public from private ([f3cadb6](https://github.com/markuplint/markuplint/commit/f3cadb630eca4a4a9b754a3cb904ca0e05665110))
- **markuplint:** export `package.json` ([c52a5b9](https://github.com/markuplint/markuplint/commit/c52a5b9afd6c5a2a32e9c46af929c28d9673f501))

## [4.10.1](https://github.com/markuplint/markuplint/compare/markuplint@4.10.0...markuplint@4.10.1) (2024-10-15)

**Note:** Version bump only for package markuplint

# [4.10.0](https://github.com/markuplint/markuplint/compare/markuplint@4.9.4...markuplint@4.10.0) (2024-10-14)

### Features

- **markuplint:** add `--severity-parse-error` option to CLI ([5b9b32f](https://github.com/markuplint/markuplint/commit/5b9b32f99049259cccea41036c4caca92be06805))
- **markuplint:** modified the API to accept `severity.parseError` ([f64a0a1](https://github.com/markuplint/markuplint/commit/f64a0a1d6b03a3731c6d5e83ea27423f96cde49d))

## [4.9.4](https://github.com/markuplint/markuplint/compare/markuplint@4.9.3...markuplint@4.9.4) (2024-09-23)

**Note:** Version bump only for package markuplint

## [4.9.3](https://github.com/markuplint/markuplint/compare/markuplint@4.9.2...markuplint@4.9.3) (2024-09-02)

**Note:** Version bump only for package markuplint

## [4.9.2](https://github.com/markuplint/markuplint/compare/markuplint@4.9.1...markuplint@4.9.2) (2024-06-25)

### Bug Fixes

- **markuplint:** ensure `--config` option correctly handles absolute paths ([fd36c1a](https://github.com/markuplint/markuplint/commit/fd36c1a4475f71d8b1e83212a60639c7361cd702))

## [4.9.1](https://github.com/markuplint/markuplint/compare/markuplint@4.9.0...markuplint@4.9.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.9.0](https://github.com/markuplint/markuplint/compare/markuplint@4.8.1...markuplint@4.9.0) (2024-05-28)

### Features

- **file-resolver:** add `resolve-pretenders` function ([68ba7f5](https://github.com/markuplint/markuplint/commit/68ba7f5acaba13484172bca3ea5f60e0bf3044ef))

## [4.8.1](https://github.com/markuplint/markuplint/compare/markuplint@4.8.0...markuplint@4.8.1) (2024-05-12)

**Note:** Version bump only for package markuplint

# [4.8.0](https://github.com/markuplint/markuplint/compare/markuplint@4.8.0-alpha.0...markuplint@4.8.0) (2024-05-04)

**Note:** Version bump only for package markuplint

# [4.8.0-alpha.0](https://github.com/markuplint/markuplint/compare/markuplint@4.7.0...markuplint@4.8.0-alpha.0) (2024-05-04)

### Features

- **rules:** apply `no-ambiguous-navigable-target-names` to build-in rules ([93d34f0](https://github.com/markuplint/markuplint/commit/93d34f0ead2624107a5b6f315af0c8bbd4f1e1ec))
- **rules:** apply `table-row-column-alignment` to build-in rules ([85de609](https://github.com/markuplint/markuplint/commit/85de6098813cd7c3167099f9e7e6250ca8324539))
