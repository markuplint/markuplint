# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **vscode:** convert absolute paths to file:// URLs before import ([b684b2f](https://github.com/markuplint/markuplint/commit/b684b2fb25833163e812408e013c070f621fb695)), closes [#3795](https://github.com/markuplint/markuplint/issues/3795)
- **vscode:** make toImportSpecifier OS-independent for POSIX absolute paths ([61da724](https://github.com/markuplint/markuplint/commit/61da7244038b686f9f6ed7536948179ce45936e5)), closes [#3841](https://github.com/markuplint/markuplint/issues/3841) [#3836](https://github.com/markuplint/markuplint/issues/3836) [#3840](https://github.com/markuplint/markuplint/issues/3840) [#3840](https://github.com/markuplint/markuplint/issues/3840) [#3842](https://github.com/markuplint/markuplint/issues/3842)

### Features

- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package vscode-markuplint

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

- feat(vscode)!: migrate publisher to markuplint namespace ([f46e4b1](https://github.com/markuplint/markuplint/commit/f46e4b159598f36cdcdb7a98025ff93147f04eb7))

### Features

- **vscode:** support prerelease extension packaging and publishing ([b7399c9](https://github.com/markuplint/markuplint/commit/b7399c90c5c407d9d859a96087d2dab53a9c8459)), closes [#3754](https://github.com/markuplint/markuplint/issues/3754)

### BREAKING CHANGES

- The VS Code extension is now published under the `markuplint`
  publisher (Marketplace ID: `markuplint.vscode-markuplint`). The legacy
  `yusukehirao.vscode-markuplint` ID is deprecated from `v5.0.0-rc.3` onwards
  and no longer receives updates; users must install the new extension.

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **vscode:** fix git blame porcelain parsing for repeated commits ([b5bb18d](https://github.com/markuplint/markuplint/commit/b5bb18d68b64f35228c7e352fd944afb284a6fe5))
- **vscode:** import isFatalError via markuplint/suppressions ([17226e4](https://github.com/markuplint/markuplint/commit/17226e4bd01adf8b7df7f7682d33cd28564ea5cd))

- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))

### Features

- **vscode:** add suppressed message prefix and blame parser tests ([cd80a80](https://github.com/markuplint/markuplint/commit/cd80a802c3bad29a8a1d510d2160a21a6f0a2682))
- **vscode:** add v5 handler with bulk suppression severity downgrade ([f31c0c9](https://github.com/markuplint/markuplint/commit/f31c0c93810a312aba948906f7f80e8814fc4078)), closes [#3536](https://github.com/markuplint/markuplint/issues/3536)

### BREAKING CHANGES

- ESLint is no longer used. Use oxlint instead.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package vscode-markuplint

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

**Note:** Version bump only for package vscode-markuplint

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Bug Fixes

- **vscode:** inline offsetToPosition to avoid unpublished @markuplint/shared export ([350bac4](https://github.com/markuplint/markuplint/commit/350bac41d9d898ac22047d324cbf4de13580e4bd))

### Features

- **vscode:** add Code Action support for autofix ([2e5e04e](https://github.com/markuplint/markuplint/commit/2e5e04e6cb6fdefcd14e476d362b1ab69a83a89c))
- **vscode:** display specConformance and unify separator ([dfba104](https://github.com/markuplint/markuplint/commit/dfba1046c052a0d6c631dc174b6fadd2006c2b74))

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Bug Fixes

- **vscode:** handle empty string from VS Code config for ariaVersion ([7cef580](https://github.com/markuplint/markuplint/commit/7cef58014d433de7acd0126e500784410c727edc))
- **vscode:** remove hardcoded ARIA version default to follow markuplint's default ([f94a692](https://github.com/markuplint/markuplint/commit/f94a692378a18688ffff433ed42efc37ee24887c))

### Features

- **vscode:** add workingDirectories option for monorepo support ([69aa2ee](https://github.com/markuplint/markuplint/commit/69aa2ee66e2ffd3973ebc6953dc6e48aa4320288)), closes [#1287](https://github.com/markuplint/markuplint/issues/1287)

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package vscode-markuplint

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **vscode:** activate extension before command registration tests ([73cf1e2](https://github.com/markuplint/markuplint/commit/73cf1e23255415a82bb77fd32dbf76cea288bb5d))
- **vscode:** add caret to engines.vscode for forward compatibility ([068e72f](https://github.com/markuplint/markuplint/commit/068e72faac12448cebae186531059e169191b08d))
- **vscode:** deep-clone defaultConfig and align fallback values ([c6d1876](https://github.com/markuplint/markuplint/commit/c6d187657bbd4ed3695a114d994a719b7fa21640))
- **vscode:** guard enable check against undefined ([bc1ae12](https://github.com/markuplint/markuplint/commit/bc1ae12f2652183852f9231091ff4803d6963120))
- **vscode:** poll for extension availability before activation in tests ([735b32a](https://github.com/markuplint/markuplint/commit/735b32a073a923a0b7ab5d06cfd59827d065c108))
- **vscode:** register commands before config/client setup in activate() ([4a1b7b3](https://github.com/markuplint/markuplint/commit/4a1b7b3721785fefb6f528c9495875c75295aafd))
- **vscode:** use getConfiguration('markuplint') in config test ([e22a7a7](https://github.com/markuplint/markuplint/commit/e22a7a7a0b108de0e04a03b870f66666e26d7d3d))
- **vscode:** use JSON round-trip instead of structuredClone for config ([e70ee38](https://github.com/markuplint/markuplint/commit/e70ee38246cd7a757d4d7143ab63f29f7b6384c1))
- **vscode:** use scoped getConfiguration for per-language config ([bc5c29e](https://github.com/markuplint/markuplint/commit/bc5c29e6eb1e844b92348345008b3ccb3d064b6a))

- feat!: remove deprecated v1 API ([f8999ae](https://github.com/markuplint/markuplint/commit/f8999aecc8e05c3ba2022a93698c87b01bbd573b))

### Features

- **vscode:** show specific warning for Node.js 22+ import assertion incompatibility ([7c77bc8](https://github.com/markuplint/markuplint/commit/7c77bc8a6c5ee37f2f9ecfd698459a54913da2ca)), closes [#2838](https://github.com/markuplint/markuplint/issues/2838)
- **vscode:** use ARIA_RECOMMENDED_VERSION constant and add 1.3 to enum ([ff7c3c2](https://github.com/markuplint/markuplint/commit/ff7c3c20baf53710ac46fd875588474589a90141))

### BREAKING CHANGES

- The `exec` export (v1 API) has been removed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

## [4.9.1](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.9.0...vscode-markuplint@4.9.1) (2026-02-10)

**Note:** Version bump only for package vscode-markuplint

# [4.9.0](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.11...vscode-markuplint@4.9.0) (2025-11-05)

### Bug Fixes

- **vscode:** align engines and @types/vscode to 1.99.1 and configure Renovate to ignore @types/vscode updates ([0d112ff](https://github.com/markuplint/markuplint/commit/0d112ff7209fc9896b92127d43279fda5bbbd574))
- **vscode:** fix typo in diagnostics logger variable name ([36a00a2](https://github.com/markuplint/markuplint/commit/36a00a2d5b1df6ee83d6b8bfec42c2497f10897d))
- **vscode:** update engines to support Cursor internal VS Code version ([35ef476](https://github.com/markuplint/markuplint/commit/35ef476fdee5883f94a6c340bd24bb9866b5cab8))

### Features

- **vscode:** add restart language server command ([c331ba8](https://github.com/markuplint/markuplint/commit/c331ba8583e40d99a396ccfcd2cddc64a6201e0c))

## [4.8.11](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.10...vscode-markuplint@4.8.11) (2025-08-24)

**Note:** Version bump only for package vscode-markuplint

## [4.8.10](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.9...vscode-markuplint@4.8.10) (2025-08-13)

**Note:** Version bump only for package vscode-markuplint

## [4.8.9](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.8...vscode-markuplint@4.8.9) (2025-04-13)

### Bug Fixes

- **vscode:** lower vscode engine requirement to 1.90 ([8aba6ed](https://github.com/markuplint/markuplint/commit/8aba6ed4dae753f5ba147342a16041eae131f58c))

## [4.8.8](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.7...vscode-markuplint@4.8.8) (2025-03-09)

**Note:** Version bump only for package vscode-markuplint

## [4.8.7](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.6...vscode-markuplint@4.8.7) (2025-02-27)

**Note:** Version bump only for package vscode-markuplint

## [4.8.6](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.5...vscode-markuplint@4.8.6) (2025-02-11)

**Note:** Version bump only for package vscode-markuplint

## [4.8.5](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.4...vscode-markuplint@4.8.5) (2025-02-04)

**Note:** Version bump only for package vscode-markuplint

## [4.8.4](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.3...vscode-markuplint@4.8.4) (2024-12-04)

**Note:** Version bump only for package vscode-markuplint

## [4.8.3](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.2...vscode-markuplint@4.8.3) (2024-11-17)

**Note:** Version bump only for package vscode-markuplint

## [4.8.2](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.1...vscode-markuplint@4.8.2) (2024-10-31)

**Note:** Version bump only for package vscode-markuplint

## [4.8.1](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.8.0...vscode-markuplint@4.8.1) (2024-10-28)

### Bug Fixes

- **vscode:** fix to importing the local module ([f45d5c3](https://github.com/markuplint/markuplint/commit/f45d5c30ddf3c9928b0f54b9347a0394aa98de6f))

# [4.8.0](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.9...vscode-markuplint@4.8.0) (2024-10-27)

### Features

- **vscode:** dropped `esm-adaptor` due to VS Code's support for ESM ([2dd2f0e](https://github.com/markuplint/markuplint/commit/2dd2f0e3d589f8eeeeeee42270c98682be7aa5a8))

## [4.7.9](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.8...vscode-markuplint@4.7.9) (2024-10-15)

**Note:** Version bump only for package vscode-markuplint

## [4.7.8](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.7...vscode-markuplint@4.7.8) (2024-10-14)

**Note:** Version bump only for package vscode-markuplint

## [4.7.7](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.6...vscode-markuplint@4.7.7) (2024-09-23)

### Bug Fixes

- **vscode:** replaced failing `structuredClone` with JSON serialization ([eed10e8](https://github.com/markuplint/markuplint/commit/eed10e8ec828c867d9101ffffe0449a08cfad64d))

## [4.7.6](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.5...vscode-markuplint@4.7.6) (2024-09-02)

**Note:** Version bump only for package vscode-markuplint

## [4.7.5](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.4...vscode-markuplint@4.7.5) (2024-06-25)

**Note:** Version bump only for package vscode-markuplint

## [4.7.4](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.3...vscode-markuplint@4.7.4) (2024-06-09)

**Note:** Version bump only for package vscode-markuplint

## [4.7.3](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.2...vscode-markuplint@4.7.3) (2024-05-28)

**Note:** Version bump only for package vscode-markuplint

## [4.7.2](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.1...vscode-markuplint@4.7.2) (2024-05-12)

**Note:** Version bump only for package vscode-markuplint

## [4.7.1](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.1-alpha.0...vscode-markuplint@4.7.1) (2024-05-04)

**Note:** Version bump only for package vscode-markuplint

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/vscode-markuplint@4.7.0...vscode-markuplint@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package vscode-markuplint

## 4.7.0

- Depends: `markuplint@4.7.0`

## 4.6.1

- Depends: `markuplint@4.6.1`

## 4.6.0

- Depends: `markuplint@4.6.0`

## 4.5.0

- Depends: `markuplint@4.5.0`

## 4.4.0

- Depends: `markuplint@4.4.0`

## 4.3.0

- Depends: `markuplint@4.3.0`

## 4.2.0

- Depends: `markuplint@4.2.0`

## 4.1.1

- Depends: `markuplint@4.1.1`

## 4.1.0

- Depends: `markuplint@4.1.0`

## 4.0.3

- Depends: `markuplint@4.0.3`

## 4.0.2

- Depends: `markuplint@4.0.2`

## 4.0.1

- Depends: `markuplint@4.0.1`

## 4.0.0

- Depends: `markuplint@4.0.0`

## 3.10.0

- Depends: `markuplint@3.15.0`

## 3.9.0

- Depends: `markuplint@3.14.0`

## 3.8.0

- Depends: `markuplint@3.13.0`

## 3.7.1

- Depends: `markuplint@3.12.1`

## 3.7.0

- Depends: `markuplint@3.12.0`

## 3.6.0

- Depends: `markuplint@3.11.0`

## 3.5.0

- Depends: `markuplint@3.10.0`

## 3.4.1

- Fix: Failed packaging.
- Depends: `markuplint@3.9.1`

## 3.4.0

- Depends: `markuplint@3.9.0`
- Change: Improve the interface to translate **Japanese**.

## 3.3.0

- Depends: `markuplint@3.8.0`

## 3.2.0

- Depends: `markuplint@3.7.0`

## 3.1.1

- Depends: `markuplint@3.6.1`
- Fix: Fixed module search to include parent directories [#802](https://github.com/markuplint/markuplint/pull/802)

## 3.1.0

- Change: Update **Markuplint** to `v3.6.0`
- Change: Improve logging
  - Support for the log level according to VS Code settings
  - Divide output channels `Markuplint` and `Markuplint Diagnostics`
- Change: Move the warning message about using the module installed in this extension to the tooltip on the status bar instead of the popover

## 3.0.2

Revert to `v3.0.0`

## 3.0.1

- :warning: This version is unavailable because the inner files are broken
- Change: Move its repository

## 3.0.0

- Change: Support for **Markuplint** `v3.x`
- Change: Add the feature that **popup Accessibility Object**

## 2.2.1

- Fix: Resolving a target path for Windows.

## 2.2.0

- Change: Supports `Smarty` format. (Needs `@markuplint/smarty-parser`)
- Fix: The evaluation stops if thrown an error

## 2.1.1

- Fix: Did not run when changing a document

## 2.1.0

- Fix: Crash when no-installed markuplint
- Change: Default loading version `2.x`
- Change: Add the setting `markuplint.defaultConfig`
- Change: Add the setting `markuplint.debug`
- Change: Make it possible to edit the setting per langages

## 2.0.3

- Change: Output the `reason`.
- Change: Supports the `info` severity.
- Change: Improve debug logs.

## 2.0.2

- Change: Improve to debounce the execution.

## 2.0.0

- Change: Support for markuplint v2.x.

## 1.10.1

- Fix: The schema path.

## 1.10.0

- change: Support for `.astro` file and `@markuplint/astro-parser`
- update: dependencies

## 1.9.2

- Fix: The schema path.

## 1.9.1

- Fix: The repository path.

## 1.9.0

- update: Supported JSX Parser and JavaScript/TypeScript file.

## 1.8.0

- update: Supported some new languages/templates.

## 1.7.0

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0

## 1.6.0

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0-alpha.57
- change: Added default configuration

## [1.3.0] - 2020-07-26

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0-alpha.53
- change: Added languages to support

## [1.2.0] - 2020-06-30

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0-alpha.45
- change: Support for `.pug` file and `@markuplint/pug-parser`

## [1.1.0] - 2019-10-15

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0-alpha.19
- change: Support for `.vue` file and `@markuplint/vue-parser`

## [1.0.0] - 2019-09-13

- update: Default [markuplint](https://github.com/markuplint/markuplint) version v1.0.0-alpha

## [0.8.0] - 2018-02-21

- change: Notify message when markuplint could not be found in the node_modules of the workspace.
- change: Show version of markuplint to status bar.

## [0.7.0] - 2018-02-20

- change: Support for `.vue` file on Vue.js
- update: Default [markuplint](https://github.com/YusukeHirao/markuplint) version [v0.21.0](https://github.com/YusukeHirao/markuplint/releases/tag/v0.21.0)

## [0.6.0] - 2018-01-20

- update: Default [markuplint](https://github.com/YusukeHirao/markuplint) version [v0.16.2](https://github.com/YusukeHirao/markuplint/releases/tag/v0.16.2)

## [0.5.1] - 2018-01-15

- bugfix: Fix importing module error.

## [0.5.0] - 2018-01-11

- change: Importing module [markuplint](https://github.com/YusukeHirao/markuplint) from node_modules on current working directory automatically
- update: Default [markuplint](https://github.com/YusukeHirao/markuplint) version [v0.14.0](https://github.com/YusukeHirao/markuplint/releases/tag/v0.14.0)

## [0.4.0] - 2018-01-08

- update module [markuplint](https://github.com/YusukeHirao/markuplint) [v0.12.0](https://github.com/YusukeHirao/markuplint/releases/tag/v0.12.0)

## [0.3.0] - 2017-12-27

- update module [markuplint](https://github.com/YusukeHirao/markuplint) [v0.11.0-beta.2](https://github.com/YusukeHirao/markuplint/releases/tag/v0.11.0-beta.2)

## [0.2.0] - 2017-12-20

- update module [markuplint](https://github.com/YusukeHirao/markuplint) [v0.9.0](https://github.com/YusukeHirao/markuplint/releases/tag/v0.9.0)

## [0.1.1] - 2017-12-14

- update module [markuplint](https://github.com/YusukeHirao/markuplint) [v0.7.0](https://github.com/YusukeHirao/markuplint/releases/tag/v0.7.0)

## [0.1.0] - 2017-12-13

- Initial release
