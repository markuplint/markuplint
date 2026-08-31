# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
