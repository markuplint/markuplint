# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.4.0](https://github.com/markuplint/markuplint/compare/v5.3.0...v5.4.0) (2026-10-29)

**Note:** Version bump only for package @markuplint/pretenders





# [5.3.0](https://github.com/markuplint/markuplint/compare/v5.2.0...v5.3.0) (2026-10-21)

### Bug Fixes

* make published packages loadable from require() and put types first ([723106f](https://github.com/markuplint/markuplint/commit/723106f51aac4e60dc02db2c1a894617368b0253)), closes [#4198](https://github.com/markuplint/markuplint/issues/4198)
* **ml-core:** decide by the name that the DOM gives an attribute ([68f732c](https://github.com/markuplint/markuplint/commit/68f732ce3eec1203fbed479af1f1488e5f272a47))
* **pretenders:** count the nested namespaces the same for the alias and the member tag ([73dcd4a](https://github.com/markuplint/markuplint/commit/73dcd4ae3b02f0e0dedd932debfc796a5c914e52))
* **pretenders:** do not resolve a name imported from a package to a same-named component ([bf78213](https://github.com/markuplint/markuplint/commit/bf782137eff6acc4602518dd084dba5f3fa65781))
* **pretenders:** do not take a missing dependency of a parser for the parser not installed ([b631323](https://github.com/markuplint/markuplint/commit/b631323e9fb9ad04b2d26bfe3ae9298d80b5bd92)), closes [#4352](https://github.com/markuplint/markuplint/issues/4352)
* **pretenders:** drop the scanned components of a name imported from a package ([4fd028c](https://github.com/markuplint/markuplint/commit/4fd028cc50d81580bf09b4926d02a3b0f305f14b))
* **pretenders:** end the chain at a package that is not installed ([7490215](https://github.com/markuplint/markuplint/commit/749021595b031b0dc05664d58e1bf95efbe48ee1)), closes [#4264](https://github.com/markuplint/markuplint/issues/4264)
* **pretenders:** escape every name of an alias as one tag name in its selector ([24f1f58](https://github.com/markuplint/markuplint/commit/24f1f587bdf49dbeefa18e304219c862a92b0a33)), closes [#4352](https://github.com/markuplint/markuplint/issues/4352)
* **pretenders:** follow dynamic import() in JSX/TSX during auto scan ([5a2e2e9](https://github.com/markuplint/markuplint/commit/5a2e2e98875451afebba21ab9e10b5a074edd47c))
* **pretenders:** follow star re-exports in a project under node_modules ([70df060](https://github.com/markuplint/markuplint/commit/70df060e90b7996ffef4d0ac1a14d4f72500f38e)), closes [#4269](https://github.com/markuplint/markuplint/issues/4269)
* **pretenders:** follow the symlink of a workspace package under node_modules ([5fece6b](https://github.com/markuplint/markuplint/commit/5fece6bdbf97363329c9187094b5afa74b376e69)), closes [#4265](https://github.com/markuplint/markuplint/issues/4265)
* **pretenders:** give a pretender to a lazy variable and a namespace member tag ([ff47d09](https://github.com/markuplint/markuplint/commit/ff47d097f4fc699cc38024ff9a019e3b82fef95b)), closes [#4315](https://github.com/markuplint/markuplint/issues/4315)
* **pretenders:** judge a package file only by the path below the project root ([c472c01](https://github.com/markuplint/markuplint/commit/c472c01dd5fc22771e33dcb753f75e6ede86fb6d))
* **pretenders:** match a lazily loaded component to the file it loads ([5f1a358](https://github.com/markuplint/markuplint/commit/5f1a3584923ea187eca81076dcbbc556b29273d6)), closes [#4292](https://github.com/markuplint/markuplint/issues/4292)
* **pretenders:** migrate parse-imports to the es-module-lexer v3 API ([7f445f3](https://github.com/markuplint/markuplint/commit/7f445f30b83a0f869e4b984db12edba6e8bdab78))
* **pretenders:** name a dynamic import by its loader's name and by the awaited import it is read in ([1322d31](https://github.com/markuplint/markuplint/commit/1322d31ccc646585983205a361ef9c80761240b7)), closes [#4323](https://github.com/markuplint/markuplint/issues/4323) [#4324](https://github.com/markuplint/markuplint/issues/4324) [#4325](https://github.com/markuplint/markuplint/issues/4325) [#4328](https://github.com/markuplint/markuplint/issues/4328) [#4330](https://github.com/markuplint/markuplint/issues/4330)
* **pretenders:** resolve `<m.default />` of a namespace to its component ([7b27881](https://github.com/markuplint/markuplint/commit/7b2788142e01480f867857498b4de5bff940caa3)), closes [#await](https://github.com/markuplint/markuplint/issues/await)
* **pretenders:** resolve a component under the name the linted file imports it as ([7b0a73c](https://github.com/markuplint/markuplint/commit/7b0a73cbd6fb56d3771d504c13f9147d0b8ee855))
* **pretenders:** resolve a dotted tag through an import that has the whole name first ([b4642f2](https://github.com/markuplint/markuplint/commit/b4642f2775b1146ba5cc956fcc653a35ca0dfaa3))
* **pretenders:** resolve a Vue tag to a component the way Vue does ([94c2cdb](https://github.com/markuplint/markuplint/commit/94c2cdbb212955071ed0580a583f16190f58afd0)), closes [VueParser#isNativeTag](https://github.com/VueParser/issues/isNativeTag)
* **pretenders:** resolve aliased loaders, awaited whole modules and exported lazy components ([20be254](https://github.com/markuplint/markuplint/commit/20be254356a92d5ae0c3b7eed85a45bb9da68484))
* **pretenders:** resolve the imports that a held loader, a Svelte await block and a tsx script make ([73f51a6](https://github.com/markuplint/markuplint/commit/73f51a663a12d4aaa9884db2936c80cbf5e77676)), closes [#await](https://github.com/markuplint/markuplint/issues/await) [#4322](https://github.com/markuplint/markuplint/issues/4322) [#4327](https://github.com/markuplint/markuplint/issues/4327) [#4359](https://github.com/markuplint/markuplint/issues/4359)
* **pretenders:** resolve the real path of a package link as TypeScript does ([d444b12](https://github.com/markuplint/markuplint/commit/d444b129c2585cd2570737830e599ee9950d20d7))
* **pretenders:** retry failed lexer init and rethrow fatal parse errors ([04f65ae](https://github.com/markuplint/markuplint/commit/04f65ae7732423647416bab831cd0818d86e2ada))

### Features

* **pretenders:** give a pretender to a default export without a name ([25ab448](https://github.com/markuplint/markuplint/commit/25ab44886e64bdd6dbd5dbeceaa65cd9d0210737)), closes [#4289](https://github.com/markuplint/markuplint/issues/4289)

### Performance Improvements

* **pretenders:** tokenize the source once to find the scanned components it names ([6f82630](https://github.com/markuplint/markuplint/commit/6f826306424c6bbb849b27c1f18f79a2dcd09e77))


# [5.2.0](https://github.com/markuplint/markuplint/compare/v5.1.1...v5.2.0) (2026-10-13)

### Bug Fixes

- **pretenders:** state the namespace of a slot wrapper ([defa163](https://github.com/markuplint/markuplint/commit/defa163dd16585e6b1be823a0a8afc64aba43c78))
- use caret ranges for third-party dependencies of published packages ([5fb5d2e](https://github.com/markuplint/markuplint/commit/5fb5d2ee81eaeea45fe7256a40dd41c95ff0d672))

## [5.1.1](https://github.com/markuplint/markuplint/compare/v5.1.0...v5.1.1) (2026-10-09)

### Bug Fixes

- **pretenders:** follow barrel re-exports in pretenders.auto ([521c110](https://github.com/markuplint/markuplint/commit/521c110a39a59abf691b481fc4d481718e4843c0)), closes [#4097](https://github.com/markuplint/markuplint/issues/4097)

# [5.1.0](https://github.com/markuplint/markuplint/compare/v5.0.1...v5.1.0) (2026-10-08)

### Bug Fixes

- **pretenders:** compose attributes through a chain of components and resolve forwarded props ([d348cec](https://github.com/markuplint/markuplint/commit/d348cec5131d9eec41a0a4d994cfc9272f46dd6e))
- **pretenders:** compose slots and contents through a chain of components ([ac6147f](https://github.com/markuplint/markuplint/commit/ac6147f4caee1a61d40c7925321fb0cdb64a88b8)), closes [#4057](https://github.com/markuplint/markuplint/issues/4057)
- **pretenders:** do not compose again when a chain of components comes back to itself ([5fe0906](https://github.com/markuplint/markuplint/commit/5fe0906e6a791e1205eebe2f5ae3b7531049357f))
- **pretenders:** hold the `pretenders.auto` import depth cap for JSX/TSX ([bb41901](https://github.com/markuplint/markuplint/commit/bb41901a3144cee48e646144a03ae254b80d4ba0)), closes [#4066](https://github.com/markuplint/markuplint/issues/4066)
- **pretenders:** keep slots: null for a component with no attributes ([b786f18](https://github.com/markuplint/markuplint/commit/b786f18513315793c3c8dee0ea5c6e8b3fa7ef27)), closes [#4082](https://github.com/markuplint/markuplint/issues/4082)
- **pretenders:** stop pretender false positives in the JSX and template scanners ([6f3f589](https://github.com/markuplint/markuplint/commit/6f3f589f42d91748230e9ca7113103c6fbff7a55)), closes [#4054](https://github.com/markuplint/markuplint/issues/4054)

### Features

- **pretenders:** record the files a scan result depends on ([2961161](https://github.com/markuplint/markuplint/commit/29611611eaf63a9d3135c096467873e81ef419eb)), closes [#4065](https://github.com/markuplint/markuplint/issues/4065)
- **pretenders:** turn dynamic template attributes into dynamic pretender attrs ([f856283](https://github.com/markuplint/markuplint/commit/f856283b233d130c6b41d7e0da25d72c5790179b)), closes [#4058](https://github.com/markuplint/markuplint/issues/4058)

## [5.0.1](https://github.com/markuplint/markuplint/compare/v5.0.0...v5.0.1) (2026-09-22)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.7...v5.0.0) (2026-09-11)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.7](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.6...v5.0.0-rc.7) (2026-08-31)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)

### Features

- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **pretenders,ml-config:** add scan field to JSON schema and narrow getParser error handling ([e5fda17](https://github.com/markuplint/markuplint/commit/e5fda171f886c1b65d6f0e536c182cebb279ea07))
- **pretenders:** add error handling to parseComponent and resolveBarrelExport ([c203c4b](https://github.com/markuplint/markuplint/commit/c203c4be341c89abfd0ba7991f09d8322d17728e))
- **pretenders:** address QA review findings for import resolver phase 2 ([d8fd73f](https://github.com/markuplint/markuplint/commit/d8fd73f533e9b1febec05d93f144f2d5122cffc9))
- **pretenders:** align import-resolver with [#3335](https://github.com/markuplint/markuplint/issues/3335) design spec ([448181a](https://github.com/markuplint/markuplint/commit/448181ac819e279c925e68c8f5577c7a7cd8ae61)), closes [#3339](https://github.com/markuplint/markuplint/issues/3339) [#3340](https://github.com/markuplint/markuplint/issues/3340)
- **pretenders:** fix ensureInit TOCTOU race condition ([d9643d8](https://github.com/markuplint/markuplint/commit/d9643d8b679e888b143d9d47f243e35fbeeb6752))
- **pretenders:** fix false positives in children detection and harden tests ([96f7af3](https://github.com/markuplint/markuplint/commit/96f7af3adf4d6a3b8c65a9e9464cf1bf34c48613))
- **pretenders:** guard dynamic parser imports and improve test coverage ([9667aa1](https://github.com/markuplint/markuplint/commit/9667aa1278a3ac737fa8c6cfc2df5c1ffd9834c9))
- **pretenders:** handle empty path edge case in deriveName ([0613743](https://github.com/markuplint/markuplint/commit/0613743c3a83c124b90a5e3f54c62e23b2a7b3bd))
- **pretenders:** pass importPath in both scanners to prevent name collision ([8644b21](https://github.com/markuplint/markuplint/commit/8644b21b99f1a5a13ab58a4d6d042d2e1aa2a446))
- **pretenders:** rename createIndentity to createIdentity ([e8f37e5](https://github.com/markuplint/markuplint/commit/e8f37e52f32107e7cc9a9415d2edb6b3bb442fe5))
- **pretenders:** warn when parser package is not found ([03d567e](https://github.com/markuplint/markuplint/commit/03d567e937228ecfd5b3d9d7811814efd9dd2d09))
- use visited set for cycle detection in dependencyMapper ([8821f4f](https://github.com/markuplint/markuplint/commit/8821f4fab9cb900582ae0f991e5efe7be413d584)), closes [#3336](https://github.com/markuplint/markuplint/issues/3336)

### Features

- **pretenders,ml-core:** implement slots detection in JSX scanner and ml-core consumption ([ad9c8e2](https://github.com/markuplint/markuplint/commit/ad9c8e20d233cddc752fce9ad83838857f81787f)), closes [#3341](https://github.com/markuplint/markuplint/issues/3341)
- **pretenders:** add import-resolver module via es-module-lexer ([19c9f65](https://github.com/markuplint/markuplint/commit/19c9f65b3856613fa2d7bc59cc79d5b829894663)), closes [#3339](https://github.com/markuplint/markuplint/issues/3339)
- **pretenders:** add MLAST-based templateScanner for Vue/Svelte/Astro ([b710639](https://github.com/markuplint/markuplint/commit/b71063937bd13523a7fef31da2c2f9095674a957)), closes [#3338](https://github.com/markuplint/markuplint/issues/3338)
- **pretenders:** dispatch CLI input to both JSX and template scanners ([a5535af](https://github.com/markuplint/markuplint/commit/a5535af1e7e496f570cddce52148eb21f9611cfe))
- **pretenders:** import resolver phase 2 — dynamic imports, Vue Options API, barrel files ([203d4fb](https://github.com/markuplint/markuplint/commit/203d4fb5bfdc0656f95a39af23b5e079ea324d39)), closes [#3359](https://github.com/markuplint/markuplint/issues/3359)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/pretenders

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.25](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.24...@markuplint/pretenders@0.0.25) (2026-02-10)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.24](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.23...@markuplint/pretenders@0.0.24) (2025-11-05)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.23](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.22...@markuplint/pretenders@0.0.23) (2025-08-24)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.22](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.21...@markuplint/pretenders@0.0.22) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

## [0.0.21](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.20...@markuplint/pretenders@0.0.21) (2025-04-13)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.20](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.19...@markuplint/pretenders@0.0.20) (2025-03-09)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.19](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.18...@markuplint/pretenders@0.0.19) (2025-02-27)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.18](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.17...@markuplint/pretenders@0.0.18) (2025-02-11)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.17](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.16...@markuplint/pretenders@0.0.17) (2025-02-04)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.16](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.15...@markuplint/pretenders@0.0.16) (2024-12-04)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.15](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.14...@markuplint/pretenders@0.0.15) (2024-11-17)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.14](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.13...@markuplint/pretenders@0.0.14) (2024-10-31)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.13](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.12...@markuplint/pretenders@0.0.13) (2024-10-28)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.12](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.11...@markuplint/pretenders@0.0.12) (2024-10-27)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.11](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.10...@markuplint/pretenders@0.0.11) (2024-10-15)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.10](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.9...@markuplint/pretenders@0.0.10) (2024-10-14)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.9](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.8...@markuplint/pretenders@0.0.9) (2024-09-23)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.8](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.7...@markuplint/pretenders@0.0.8) (2024-09-02)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.7](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.6...@markuplint/pretenders@0.0.7) (2024-06-25)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.6](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.5...@markuplint/pretenders@0.0.6) (2024-06-09)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.5](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.4...@markuplint/pretenders@0.0.5) (2024-05-28)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.4](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.3...@markuplint/pretenders@0.0.4) (2024-05-12)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.3](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.3-alpha.0...@markuplint/pretenders@0.0.3) (2024-05-04)

**Note:** Version bump only for package @markuplint/pretenders

## [0.0.3-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/pretenders@0.0.2...@markuplint/pretenders@0.0.3-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/pretenders
