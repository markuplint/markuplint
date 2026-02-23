# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Bug Fixes

- **vscode:** handle empty string from VS Code config for ariaVersion ([7cef580](https://github.com/markuplint/markuplint/commit/7cef58014d433de7acd0126e500784410c727edc))
- **vscode:** remove hardcoded ARIA version default to follow markuplint's default ([f94a692](https://github.com/markuplint/markuplint/commit/f94a692378a18688ffff433ed42efc37ee24887c))

### Features

- **html-spec:** add 32 MathML element specifications ([2acf2e1](https://github.com/markuplint/markuplint/commit/2acf2e1f1c6f536a6de424a6b7eb6c9b9ca2c178))
- **markuplint:** integrate autofix results into MLEngine ([1558a5c](https://github.com/markuplint/markuplint/commit/1558a5cbdddda6845cf2570252920f5c489a6acc))
- **ml-config:** add autofix type definitions ([d7149c3](https://github.com/markuplint/markuplint/commit/d7149c319fe5f24dc96bfcbd5d83206c0f8e61ed))
- **ml-core:** implement autofix engine with fix-applier and rule-fixer ([36efcec](https://github.com/markuplint/markuplint/commit/36efcecb17e2f4e0729390b1684e571c13c38a38))
- **ml-spec:** add MathML content model categories and namespace support ([80f0945](https://github.com/markuplint/markuplint/commit/80f0945595aed48c9766423e83e8cd2b1c454a54))
- **parser-utils:** add MathML namespace detection ([6c27e45](https://github.com/markuplint/markuplint/commit/6c27e45475104d744a8109e8e36698bd9dba4e8b))
- **rules:** add inline fix callbacks to three rules ([16f9600](https://github.com/markuplint/markuplint/commit/16f9600a1f495046541c195859e218ca6dd61eca))
- **selector:** add MathML namespace selector support ([59c385d](https://github.com/markuplint/markuplint/commit/59c385dedb28c0be2fa9fbbb351e8debd0401412))
- **spec-generator:** add MathML element scraping support ([0c56ba4](https://github.com/markuplint/markuplint/commit/0c56ba4c8ca1a2e401da5cfea0f5cf8f9056f737))
- **vscode:** add workingDirectories option for monorepo support ([69aa2ee](https://github.com/markuplint/markuplint/commit/69aa2ee66e2ffd3973ebc6953dc6e48aa4320288)), closes [#1287](https://github.com/markuplint/markuplint/issues/1287)
- **website:** add visual regression tests and improve CI workflow ([d1286d6](https://github.com/markuplint/markuplint/commit/d1286d611f140b87308ad7f57eca3cacfa7b36b7)), closes [#1386](https://github.com/markuplint/markuplint/issues/1386)

### BREAKING CHANGES

- **ml-core:** verify() now returns VerifyResult instead of
  Violation[]. RuleSeed.fix() is removed in favor of inline fix
  callbacks on report().

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

### Bug Fixes

- **file-resolver:** fix matches() normalization asymmetry and harden tests ([4651df9](https://github.com/markuplint/markuplint/commit/4651df9679427755a3848937b3b8f5546cb04371))
- **file-resolver:** fix Windows path normalization for non-C: drives ([f31a942](https://github.com/markuplint/markuplint/commit/f31a9427fc417f444df26ad1a931d4df5957f29f)), closes [#1806](https://github.com/markuplint/markuplint/issues/1806)
- **file-resolver:** skip platform-specific fromFileURL tests per OS ([4c05356](https://github.com/markuplint/markuplint/commit/4c0535657a748d63f7832efeb3d33b43e5b8e081))
- **ml-spec:** add transparent traversal fallback in collectLabelText ([d6096c1](https://github.com/markuplint/markuplint/commit/d6096c1ceba190e7799974d0c682695946f852ed))
- **parser-utils:** skip text trimming when text node is a descendant of the next node ([1bfcede](https://github.com/markuplint/markuplint/commit/1bfcedebbd115ea817df76a979b4e10a26d0a2b2))

- fix(rules)!: remove complementary from top-level landmark check ([4643651](https://github.com/markuplint/markuplint/commit/4643651d256276ae0473d4756e72277d59398e3d))
- feat(ml-spec)!: update default ARIA version to 1.3 ([c3b56e2](https://github.com/markuplint/markuplint/commit/c3b56e2bf06a667a00aa621f2f51a082a90d4e2f))

### Features

- **html-spec:** add conditional aside role mapping for ARIA 1.3 ([f3315b7](https://github.com/markuplint/markuplint/commit/f3315b7352d17308c8d6edfc0831da3cb33a0922))
- **react-spec:** use acceptedAttrNames and add contenteditable override ([62656e5](https://github.com/markuplint/markuplint/commit/62656e56771d88cf79976750bf261b4d217ca464))
- **svelte-spec:** use acceptedAttrNames and add contenteditable override ([60a6279](https://github.com/markuplint/markuplint/commit/60a627907b93543b542b9578b53cbe06406a5196))

### BREAKING CHANGES

- The landmark-roles rule no longer checks that
  complementary landmarks are top-level. This aligns with axe-core's
  deprecation of landmark-complementary-is-top-level.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- The default ARIA specification version used when none
  is explicitly configured changes from 1.2 to 1.3. This may produce
  different lint results for rules that depend on ARIA version.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **config-presets:** scope tabindex allowAttrs to non-dialog elements ([faa327d](https://github.com/markuplint/markuplint/commit/faa327db131f123dd0ecca8fc76db3d576541597))
- **create-rule:** use toSorted in spec files to satisfy ESLint ([130372f](https://github.com/markuplint/markuplint/commit/130372fb5f74802f66b31ea9b50c4825d54f1850))
- disable unicorn/no-array-sort rule and fix no-immediate-mutation ([bf76be2](https://github.com/markuplint/markuplint/commit/bf76be26478aa2a03528f9182cb11d123b44db44))
- **file-resolver:** use "options" instead of deprecated "option" in test fixtures ([98a53f2](https://github.com/markuplint/markuplint/commit/98a53f27c4a6e640f20e2c74421c1cdeba3e7db5))
- **github:** use local vitest instead of npm: specifier in Deno CI ([de26c07](https://github.com/markuplint/markuplint/commit/de26c07b78324a4e6fa88b5afa0fdd802dec46f3))
- **html-spec:** add aria-valuenow restrictions and missing alt fields ([b5af2b5](https://github.com/markuplint/markuplint/commit/b5af2b57238e40c4bf807fb968b4309871709046)), closes [#3214](https://github.com/markuplint/markuplint/issues/3214) [#2465](https://github.com/markuplint/markuplint/issues/2465)
- **html-spec:** add missing dpub-aria source URL to generated spec data ([0797e83](https://github.com/markuplint/markuplint/commit/0797e832a4b1c6ce80b1dc32529228db5a3e07cb))
- **html-spec:** fix optgroup selector and remove stale comment ([f6bcd7f](https://github.com/markuplint/markuplint/commit/f6bcd7f7036516e236117c34349085986efacfc3))
- **html-spec:** mark input switch attribute as non-standard ([5b28f44](https://github.com/markuplint/markuplint/commit/5b28f447b31f38420b8e0cc91827f66e0fe4331d))
- **html-spec:** update ARIA role descriptions for combobox, tab, and tabpanel ([4b8e5cc](https://github.com/markuplint/markuplint/commit/4b8e5cc69c9e2bd1c83b8dbf0a991324263a7156))
- **html-spec:** update as attribute enum values based on WHATWG spec changes ([f10bd77](https://github.com/markuplint/markuplint/commit/f10bd77e647d37b41a0ee99b1adfe4fd0cb42831)), closes [whatwg/html#10212](https://github.com/whatwg/html/issues/10212) [whatwg/html#11981](https://github.com/whatwg/html/issues/11981) [#1987](https://github.com/markuplint/markuplint/issues/1987)
- **jsx-parser:** add type assertion for error.location in parseError ([7fc2d5c](https://github.com/markuplint/markuplint/commit/7fc2d5c5c01cf3877ce28a218884acae313f39ea))
- **jsx-parser:** use error.location instead of getter properties for parse error position ([674ad9a](https://github.com/markuplint/markuplint/commit/674ad9a5b9d71feda6d3f64839896e962a4d9f63))
- **markuplint:** remove async from i18n since os-locale v8 is sync ([3d1f4a6](https://github.com/markuplint/markuplint/commit/3d1f4a68afd2c2a2eac286710d9874dec492c326))
- **markuplint:** set LANG=en in allow warnings test for CI compatibility ([5d4ea00](https://github.com/markuplint/markuplint/commit/5d4ea003e8153e481b9501b18253757a4b891267))
- **markuplint:** update os-locale from v6 to v8 ([f10d128](https://github.com/markuplint/markuplint/commit/f10d1280b9dec56ff34fe0d27065f69a61d9231d))
- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))
- **ml-spec:** add explicit return type to getContentModel to fix d.ts output ([52724e5](https://github.com/markuplint/markuplint/commit/52724e5f40813b7637862bfe5c7d40f3908113b3))
- **ml-spec:** fix broken getContentModel cache using WeakMap ([4074caa](https://github.com/markuplint/markuplint/commit/4074caa002fed6fd5a8b63da88ea356b544d1f57)), closes [#1022](https://github.com/markuplint/markuplint/issues/1022)
- **ml-spec:** gate context role transparency to ARIA 1.3 only ([0535787](https://github.com/markuplint/markuplint/commit/053578760013f308e6135fb4c482e90e0d983643))
- replace semicolons with && and remove actionlint glob arg for Windows compat ([9bb892c](https://github.com/markuplint/markuplint/commit/9bb892c7b425bccf7d666340965c6ddc90654c78))
- replace single quotes with double quotes in website scripts for Windows compat ([4775ea8](https://github.com/markuplint/markuplint/commit/4775ea84eda8f1e616fa41d17ad8875b528c9b97))
- resolve additional eslint-plugin-unicorn v63 errors ([e58a72c](https://github.com/markuplint/markuplint/commit/e58a72c17c97bbec522f9513b99777fac6904d64))
- **rules:** address review feedback for require-dialog-autofocus ([6fcadb2](https://github.com/markuplint/markuplint/commit/6fcadb2ab0e6a974e8ba6f644eff914a7840b8ef))
- **spec-generator:** add windowsPathsNoEscape option to glob call ([77189eb](https://github.com/markuplint/markuplint/commit/77189ebaa7511c32e50246a4b70dbe495117b784))
- **spec-generator:** disable progress bar in CI and run up:gen twice daily ([526044d](https://github.com/markuplint/markuplint/commit/526044d26ed207e0c2a04c266c9491a14c56b3e1))
- **svelte-parser:** map IDL attribute names to content attribute names ([3e5006f](https://github.com/markuplint/markuplint/commit/3e5006f2b9f6dd5ca3af3c8727439d9ab04d696b))
- **svelte-spec:** allow IDL property attributes on form elements ([418e88d](https://github.com/markuplint/markuplint/commit/418e88dac4158d25be883f1495592c495849ca75)), closes [#2590](https://github.com/markuplint/markuplint/issues/2590)
- **test:** add pnpm.overrides to sandbox tests for local dep resolution ([a46b3da](https://github.com/markuplint/markuplint/commit/a46b3da5b16b6b3854f70afaf11398df63046aa9))
- treat orphaned end tags as bogus instead of plain text ([#1575](https://github.com/markuplint/markuplint/issues/1575)) ([557199a](https://github.com/markuplint/markuplint/commit/557199a6960ab35573a544f9a33c00e98eb9967e))
- **types:** accept BCP 47 private-use tags like x-default ([#718](https://github.com/markuplint/markuplint/issues/718)) ([b335452](https://github.com/markuplint/markuplint/commit/b3354523d0a0686fd029f1e3e81ec3900bc6d4a8))
- **types:** propagate caseInsensitive param in Token array recursion ([2d72f96](https://github.com/markuplint/markuplint/commit/2d72f96774cf733842392ce69700cd31f7783105))
- **types:** reject mixed width and density descriptors in Srcset validator ([00a2ad0](https://github.com/markuplint/markuplint/commit/00a2ad0c5e70d35bc1842476ab54ecf381f6ebcc))
- **types:** use instanceof TypeError for URL validation error handling ([9fd23fa](https://github.com/markuplint/markuplint/commit/9fd23fa4a662bd1394042c89a2c049992fa652c1))
- update glob import to use named export ([c78c98f](https://github.com/markuplint/markuplint/commit/c78c98ff2b4855853f116911eaaf37a773c4ae66))
- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))
- use postinstall instead of prepare for husky setup ([6f56982](https://github.com/markuplint/markuplint/commit/6f56982cbd860ae6b6e7a1acae85ecb7c1dc9787))
- **vscode:** activate extension before command registration tests ([73cf1e2](https://github.com/markuplint/markuplint/commit/73cf1e23255415a82bb77fd32dbf76cea288bb5d))
- **vscode:** add caret to engines.vscode for forward compatibility ([068e72f](https://github.com/markuplint/markuplint/commit/068e72faac12448cebae186531059e169191b08d))
- **vscode:** deep-clone defaultConfig and align fallback values ([c6d1876](https://github.com/markuplint/markuplint/commit/c6d187657bbd4ed3695a114d994a719b7fa21640))
- **vscode:** guard enable check against undefined ([bc1ae12](https://github.com/markuplint/markuplint/commit/bc1ae12f2652183852f9231091ff4803d6963120))
- **vscode:** poll for extension availability before activation in tests ([735b32a](https://github.com/markuplint/markuplint/commit/735b32a073a923a0b7ab5d06cfd59827d065c108))
- **vscode:** register commands before config/client setup in activate() ([4a1b7b3](https://github.com/markuplint/markuplint/commit/4a1b7b3721785fefb6f528c9495875c75295aafd))
- **vscode:** use getConfiguration('markuplint') in config test ([e22a7a7](https://github.com/markuplint/markuplint/commit/e22a7a7a0b108de0e04a03b870f66666e26d7d3d))
- **vscode:** use JSON round-trip instead of structuredClone for config ([e70ee38](https://github.com/markuplint/markuplint/commit/e70ee38246cd7a757d4d7143ab63f29f7b6384c1))
- **vscode:** use scoped getConfiguration for per-language config ([bc5c29e](https://github.com/markuplint/markuplint/commit/bc5c29e6eb1e844b92348345008b3ccb3d064b6a))
- **vue-parser:** update vue-eslint-parser to 10.3.0 and fix TS4053 errors ([b4633ea](https://github.com/markuplint/markuplint/commit/b4633eaeeb55c3b969127071094fde8e51bfb451))
- **website:** strip README.md suffix from rule cross-references ([63c0642](https://github.com/markuplint/markuplint/commit/63c0642bc8e7b398eb9b07e7b0d6a14f01dd6eb6))

### Code Refactoring

- **ml-config:** remove array support for specs ([d45663b](https://github.com/markuplint/markuplint/commit/d45663ba9fd19b111f19b21ba3eecf95895d18ac))
- **ml-config:** remove deprecated rule types ([e5d2b2d](https://github.com/markuplint/markuplint/commit/e5d2b2d6b5d7f6a060e1ea2160be97ad3ca02084))

- feat(rules)!: simplify invalid-attr options and remove attrs ([3ced12d](https://github.com/markuplint/markuplint/commit/3ced12d200f12ba4c9e177c9aaca25e7e24a9151))
- feat(rules)!: add no-unsupported-features rule for browser support checks ([8525a96](https://github.com/markuplint/markuplint/commit/8525a96fb04f634820362a9a73d6541284b53686))
- feat!: stop loading default config when --config is specified (#1862) ([1b8aa71](https://github.com/markuplint/markuplint/commit/1b8aa710bad65fa626e55a0ebae80d591b915e31)), closes [#1862](https://github.com/markuplint/markuplint/issues/1862)
- feat!: remove deprecated v1 API ([f8999ae](https://github.com/markuplint/markuplint/commit/f8999aecc8e05c3ba2022a93698c87b01bbd573b))
- refactor(ml-config)!: change pretenders merge behavior ([e7b00ab](https://github.com/markuplint/markuplint/commit/e7b00abd80dd75a6060697b30d59d0371ae3694b))
- refactor(ml-config)!: change rule value array merge to override ([05c23ac](https://github.com/markuplint/markuplint/commit/05c23ace31a3429233b3411c8b95ae62438be6e5)), closes [#1104](https://github.com/markuplint/markuplint/issues/1104)
- refactor(ml-config)!: replace deepmerge with shallow merge ([15b4945](https://github.com/markuplint/markuplint/commit/15b494546b9016189a790b2ea49fcc2bb38c85c4))
- feat(rules)!: change ignoreOmittedElements default to true ([5ec04a7](https://github.com/markuplint/markuplint/commit/5ec04a7d63cbf19846b42124c22653197f603a59)), closes [#3136](https://github.com/markuplint/markuplint/issues/3136)
- feat(markuplint)!: wire ruleCommonSettings and set allowWarnings default to true ([79524a4](https://github.com/markuplint/markuplint/commit/79524a407f1bf5015c700d11599c4caca0d3a33d))
- refactor(file-resolver)!: drop MLMarkupLanguageParser support ([3272ee7](https://github.com/markuplint/markuplint/commit/3272ee72a7c4fb3105fbecd41ec4ba5eff030092))
- refactor(rules)!: replace selfClosingSolidus with tagCloseChar ([f9cd9d8](https://github.com/markuplint/markuplint/commit/f9cd9d81bfb0ba49c2578eace7b04a9a1ebdd12a))
- feat(ml-core)!: adapt DOM layer to simplified AST types ([5d92f2b](https://github.com/markuplint/markuplint/commit/5d92f2be75ce0d45823fb26f72588aecee278ba3))
- refactor(astro-parser)!: update for simplified AST token properties ([4c05de1](https://github.com/markuplint/markuplint/commit/4c05de151d30233a8d4a184c4cb70c26de19b36b))
- refactor(pug-parser)!: update for simplified AST token properties ([7e0704e](https://github.com/markuplint/markuplint/commit/7e0704e32761f418a0c2e078557e797dae80b722))
- refactor(svelte-parser)!: use blockBehavior and simplified tokens ([7342981](https://github.com/markuplint/markuplint/commit/734298138b1d56685499415db397be7136fcb75d))
- refactor(vue-parser)!: update for simplified AST token properties ([b7e52df](https://github.com/markuplint/markuplint/commit/b7e52df21b6af0a4f2b61b327e60ed609f4359cc))
- refactor(jsx-parser)!: update blockBehavior comment for new API ([efab137](https://github.com/markuplint/markuplint/commit/efab137c748647f64d6b4fbbcb0f48fc7f7a5217))
- refactor(html-parser)!: update for simplified AST token properties ([524ce5d](https://github.com/markuplint/markuplint/commit/524ce5d6fc23c8bff73583ed4ac42fdff1759938))
- feat(parser-utils)!: adapt to simplified MLASTToken properties ([5cbbc9c](https://github.com/markuplint/markuplint/commit/5cbbc9ca8f77a71d99bffa14b193c79b26c1c415))
- feat(ml-ast)!: simplify AST token properties and restructure block types ([78f8a77](https://github.com/markuplint/markuplint/commit/78f8a77c76728df8090fcf54c7c5541bedb56f9d))

### Features

- add @markuplint/htmx-spec and @markuplint/alpine-spec packages ([75f5cd6](https://github.com/markuplint/markuplint/commit/75f5cd68e33ef3a53483254c2956f8c07ec235b6))
- add /issue slash command for GitHub Issue analysis ([d29dd92](https://github.com/markuplint/markuplint/commit/d29dd9290097def14824b5e0bded27ca0ce5b65c))
- add product-manager and qa-engineer skills ([9bd0b4c](https://github.com/markuplint/markuplint/commit/9bd0b4cbbd45bb887126e3efba5fbd0826bbddf2))
- add specConformance, named nodeRules, and namespace wildcard to config schema ([4b69f6f](https://github.com/markuplint/markuplint/commit/4b69f6f07efaae129d0ec347862ad73a212225aa))
- **alpine-parser:** support loop blocks ([d92c53c](https://github.com/markuplint/markuplint/commit/d92c53ce7337a2b39f78cbc43edbe1aba2232bae))
- **astro-parser:** support loop blocks ([ebe2eb6](https://github.com/markuplint/markuplint/commit/ebe2eb6b85aa32ff3f29964e333d058afe99d18b))
- **config-presets:** add compat preset and extend recommended ([c306134](https://github.com/markuplint/markuplint/commit/c3061348f1d8034f5b7b6ebad630fd9b1f8edef8))
- **config-presets:** add link-types rule to html-standard preset ([5e4a4d0](https://github.com/markuplint/markuplint/commit/5e4a4d01211a7bdbd08f20e76d83d9e052ceace0))
- **config-presets:** add named nodeRules and specConformance to presets ([c94e82f](https://github.com/markuplint/markuplint/commit/c94e82f226ceffbd89b12fcd04e7ee556f8c4063))
- **config-presets:** add named rule groups and specConformance to all presets ([1ef5d58](https://github.com/markuplint/markuplint/commit/1ef5d58dfbc0a02e6574448fa58b419115baceb2))
- **config-presets:** add no-shortcut-icon rule to html-standard preset ([6420fbc](https://github.com/markuplint/markuplint/commit/6420fbc5728ffe5a79b50e7694ddf93d00c01b50)), closes [#715](https://github.com/markuplint/markuplint/issues/715)
- **config-presets:** add redundant-accessible-name rule to a11y preset ([8c66b37](https://github.com/markuplint/markuplint/commit/8c66b37714abfa3f0a0c95564f703e00f963ca7c))
- **config-presets:** add srcset-sizes-constraint to html-standard preset ([9a3f564](https://github.com/markuplint/markuplint/commit/9a3f5643a9f0bfe0f437ab6f4415f6e5d35a0847))
- **config-presets:** disallow user-scalable=no in viewport meta for a11y preset ([9703c79](https://github.com/markuplint/markuplint/commit/9703c791fa220dc28698e3d7a27c19e716de21de))
- delete htmx-parser, simplify alpine-parser, add migration guide and tests ([f8dbb09](https://github.com/markuplint/markuplint/commit/f8dbb090707d8cfbf3d859a9b868b2087064f89b))
- **file-resolver:** add .jsonc config file support via cosmiconfig ([755848d](https://github.com/markuplint/markuplint/commit/755848dbec75105e3cdf9de6becb84546b66deec))
- **html-spec:** add 41 DPub ARIA roles to generated spec data ([a98b9e5](https://github.com/markuplint/markuplint/commit/a98b9e53b5d96b700e66291dd643534f7df5cbaf))
- **html-spec:** require href or imagesrcset on link element ([e6a2631](https://github.com/markuplint/markuplint/commit/e6a26318ed8e4be9ba4e81884eb0b879a816efb5)), closes [#717](https://github.com/markuplint/markuplint/issues/717)
- **i18n:** add Japanese translations for context role messages ([f57ad49](https://github.com/markuplint/markuplint/commit/f57ad4975cb2384ce110c1136f4c78864da2d9a7))
- **jsx-parser:** support loop blocks ([8b287a8](https://github.com/markuplint/markuplint/commit/8b287a811bab67a17a8dd9372058721e4416ab70))
- **markdown-parser:** add Markdown parser for markuplint ([cc30558](https://github.com/markuplint/markuplint/commit/cc3055816f1fad56ba4691df445865f3f82dc500))
- **markuplint:** display virtual rule names in reporters ([39a0473](https://github.com/markuplint/markuplint/commit/39a04737926d254d72082a1091b931c72b68cbc6))
- **mdx-parser:** add MDX parser for markuplint ([a097250](https://github.com/markuplint/markuplint/commit/a0972504aac1317cda5b2e6f0b2f3a1d7bc578fd))
- **ml-config:** add name and specConformance properties to nodeRule types ([af53042](https://github.com/markuplint/markuplint/commit/af5304218f7a207a1d8e61464c81c42d5ee1bf01))
- **ml-config:** add named rule group types, merge logic, and type guards ([9f625fd](https://github.com/markuplint/markuplint/commit/9f625fdcd9bc821d2be53668ac0eb676597aa935))
- **ml-config:** add ruleCommonSettings.ariaVersion option ([f2cd713](https://github.com/markuplint/markuplint/commit/f2cd7132311c00c22d68c4685b4a280b77ee6463))
- **ml-core:** add directive and IDL resolution to MLAttr constructor ([ba0ad66](https://github.com/markuplint/markuplint/commit/ba0ad66585c022cdb34fda8a8191bcc9af078e07))
- **ml-core:** add expandNamedRules for named rule groups in rules section ([7eed355](https://github.com/markuplint/markuplint/commit/7eed355075cee90b17a79c0f8a5b18213d1ce54e))
- **ml-core:** implement VirtualRule system for named nodeRules ([864f51d](https://github.com/markuplint/markuplint/commit/864f51d54dba26c6af2bc45eea3566db5f7d8e26))
- **ml-core:** require defaultValue for non-boolean rule types in createRule ([6c99908](https://github.com/markuplint/markuplint/commit/6c999087feff4fb8906cf47d564ee08ca8e5f450)), closes [#808](https://github.com/markuplint/markuplint/issues/808)
- **ml-core:** the each block skips linting in childNodes ([d5ca83d](https://github.com/markuplint/markuplint/commit/d5ca83d5ec6dc9b2f40b5d6599b07cc4746f3dca))
- **ml-core:** wire ruleCommonSettings through MLCore to Document ([28bb176](https://github.com/markuplint/markuplint/commit/28bb17601b983b3789b2ae200bd77ad887905cda))
- **ml-spec,rules:** adopt ARIA 1.3 property names with 1.2 compat ([4f7e54d](https://github.com/markuplint/markuplint/commit/4f7e54d21593495d36e48fbe8ad27f8be85ab5ef))
- **ml-spec:** add ARIA 1.3 generic role transparency and image/img synonym ([58172f0](https://github.com/markuplint/markuplint/commit/58172f0ed3925bc3d68f5573ff0ba9b158db588b)), closes [#1265](https://github.com/markuplint/markuplint/issues/1265) [#2364](https://github.com/markuplint/markuplint/issues/2364)
- **ml-spec:** add context role validation with caching and transparency ([7a27e0d](https://github.com/markuplint/markuplint/commit/7a27e0d729256919c926b03a11daeeebfd513e4b))
- **ml-spec:** add declarative directivePatterns for parser-less framework support ([ceb9aa6](https://github.com/markuplint/markuplint/commit/ceb9aa67048e3a058b40a9e4d91eb903c8ff1861))
- **ml-spec:** add dpubRoles to ARIASpec type and algorithms ([f88fe77](https://github.com/markuplint/markuplint/commit/f88fe778594e032e003c09396e53e9f64d4772c8)), closes [#1490](https://github.com/markuplint/markuplint/issues/1490)
- **ml-spec:** add useIDLAttributeNames to ExtendedSpec type and merge logic ([ad4f563](https://github.com/markuplint/markuplint/commit/ad4f563a417e3a706f04882252aed2e89fb109c3))
- **pug-parser:** support loop blocks ([1ed3ab8](https://github.com/markuplint/markuplint/commit/1ed3ab82203dbb32389c78a669a43412a8b407e2))
- **react-spec:** add useIDLAttributeNames flag for IDL attribute resolution ([8d19c0c](https://github.com/markuplint/markuplint/commit/8d19c0cff75b5f0ee9703df08591642a8bd4fa47))
- **rules:** add correct-aspect-ratio rule ([4068582](https://github.com/markuplint/markuplint/commit/40685828da697dfa8565288438a5d027dd0fae45))
- **rules:** add ignoreAttrs option to required-attr rule ([#690](https://github.com/markuplint/markuplint/issues/690)) ([fe4ce5e](https://github.com/markuplint/markuplint/commit/fe4ce5e283bc9e5284d209322dc0bbe3cbe07d55))
- **rules:** add link-types rule for rel attribute validation ([95d22a5](https://github.com/markuplint/markuplint/commit/95d22a596c1f786c385b7e99c3b818434995f4b5))
- **rules:** add redundant-accessible-name rule for detecting overridden accessible name sources ([63b89d4](https://github.com/markuplint/markuplint/commit/63b89d47bf5056f823d5b27cda4fda2b96419bb3))
- **rules:** add require-dialog-autofocus rule ([2d8d650](https://github.com/markuplint/markuplint/commit/2d8d650f8bc82e706687d292b27c310f3552b418)), closes [#689](https://github.com/markuplint/markuplint/issues/689)
- **rules:** add required context role check to wai-aria rule ([#970](https://github.com/markuplint/markuplint/issues/970)) ([1433a5a](https://github.com/markuplint/markuplint/commit/1433a5ae429aca4e7dc0a1a7f514a184eb423c03))
- **rules:** add srcset-sizes-constraint rule ([#1051](https://github.com/markuplint/markuplint/issues/1051)) ([bcc624a](https://github.com/markuplint/markuplint/commit/bcc624a3c6535ef85ad155b05d7571198983277a))
- **rules:** recognize DPub ARIA roles in wai-aria rule ([3dd32ff](https://github.com/markuplint/markuplint/commit/3dd32ffa7e5e706bad33bf9b9ff1785de8c8e630))
- **rules:** suggest similar attribute names for typos in invalid-attr rule ([337c7c5](https://github.com/markuplint/markuplint/commit/337c7c56b792cf7bc72baa3a2528f0c93892d550)), closes [#1487](https://github.com/markuplint/markuplint/issues/1487)
- **rules:** support ARIA 1.3 generic transparency in owned elements check ([c1d6991](https://github.com/markuplint/markuplint/commit/c1d6991cb197d511c5751bba183fde1208001590))
- **rules:** support source elements inside picture in correct-aspect-ratio ([3cd3dc9](https://github.com/markuplint/markuplint/commit/3cd3dc9981a04f4ff5b78b97c28cc7852d31886e))
- **rules:** use ruleCommonSettings.ariaVersion fallback in ARIA rules ([07ccd8a](https://github.com/markuplint/markuplint/commit/07ccd8acd8b9db11ccf473b419a3d01cc782e15c))
- **spec-generator:** scrape DPub ARIA roles from W3C spec ([681abed](https://github.com/markuplint/markuplint/commit/681abed45c1e61facba040fc3535e3e46ea410be))
- **svelte-spec:** add directivePatterns and useIDLAttributeNames ([78568cf](https://github.com/markuplint/markuplint/commit/78568cff19bef02a8f255eed33bb7e50a8c89c6d))
- **tagged-template-literal-parser:** add tagged template literal parser ([5224ef4](https://github.com/markuplint/markuplint/commit/5224ef40c5d5c6baa4621b86f9a1b251a83b2b91)), closes [#221](https://github.com/markuplint/markuplint/issues/221)
- **types:** add Pattern type to Type union for regex validation ([06528bd](https://github.com/markuplint/markuplint/commit/06528bd63a1988ef06f95c17ae63b88f3e699451))
- **types:** export getCandidate function for attribute name suggestion ([100e467](https://github.com/markuplint/markuplint/commit/100e467bdd8bb5acd6075c2d1e12e3e33f5f9090))
- **types:** export link type data arrays and types ([b45937d](https://github.com/markuplint/markuplint/commit/b45937da166f4032262bcd3be1b3338fa6abdb14))
- update config schema for named rule groups ([9211aa8](https://github.com/markuplint/markuplint/commit/9211aa806fb8845c1bf42d1786459ab8bc379102))
- **vscode:** show specific warning for Node.js 22+ import assertion incompatibility ([7c77bc8](https://github.com/markuplint/markuplint/commit/7c77bc8a6c5ee37f2f9ecfd698459a54913da2ca)), closes [#2838](https://github.com/markuplint/markuplint/issues/2838)
- **vscode:** use ARIA_RECOMMENDED_VERSION constant and add 1.3 to enum ([ff7c3c2](https://github.com/markuplint/markuplint/commit/ff7c3c20baf53710ac46fd875588474589a90141))
- **vue-spec:** add directivePatterns for Vue directive resolution ([2873205](https://github.com/markuplint/markuplint/commit/2873205cff7a7f0c2cc945e008a27e9592bcc876))

### Performance Improvements

- **ml-core:** add memoization cache to MLElement.getAccessibleName() ([cdbe289](https://github.com/markuplint/markuplint/commit/cdbe289755312ee30e3f02171f42bf2c00412eea)), closes [#2179](https://github.com/markuplint/markuplint/issues/2179)
- **rules:** fix exponential slowdown in transparent element resolution ([f657e6a](https://github.com/markuplint/markuplint/commit/f657e6a0156933c3acafb8e3975fbc31488b7cca)), closes [#3249](https://github.com/markuplint/markuplint/issues/3249)
- **selector:** use cached getAccessibleName in :aria() pseudo-class ([42ea466](https://github.com/markuplint/markuplint/commit/42ea4665308e2b90e90856b29be939a6e8022347)), closes [#2179](https://github.com/markuplint/markuplint/issues/2179)

### Reverts

- restore original CLI test assertions ([487c96a](https://github.com/markuplint/markuplint/commit/487c96aed4abebe6029b12c1b09757926f714fe1))

### BREAKING CHANGES

- Remove the deprecated `attrs` option and the
  `{ type: X }` value wrapper from `invalid-attr` rule options.

* Remove `attrs` option (deprecated since v3.7.0)
* Remove `{ type: X }` wrapper; specify type strings directly
* Deprecate object format for `allowAttrs`/`disallowAttrs`
* Unify value type validation via the types API

- non-standard element/attribute detection moved from
  deprecated-element to no-unsupported-features with checkNonStandard option.
  Users of recommended preset are unaffected (auto-enabled via compat preset).
- `--config` no longer merges with auto-discovered config files.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- The `exec` export (v1 API) has been removed.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Pretender files/imports are now overridden instead
  of deep-merged. Pretender data continues to be appended.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Rule value arrays are now overridden instead of
- Object properties in config are now shallow-merged
  instead of deep-merged. Nested objects within parser, specs, etc.
  will be replaced entirely by the overriding config.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- **ml-config:** The array format for `specs` is no longer accepted.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- **ml-config:** RuleV2, RuleConfigV2, AnyRuleV2 types are removed.
  The deprecated `option` field is no longer supported; use `options`.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- The `ignoreOmittedElements` option in the
  `required-element` rule now defaults to `true` instead of `false`.
  Ghost (omitted) elements implicitly created by the HTML parser
  are no longer counted as satisfying the requirement by default.
  Users who relied on the previous behavior should explicitly set
  `ignoreOmittedElements: false`.
- --allow-warnings now defaults to true. Use --no-allow-warnings
  to restore the previous behavior of returning exit code 1 when warnings exist.
- Remove MLMarkupLanguageParser compatibility from
  resolve-parser. Parser modules must now export MLParserModule
  with a parser property.

* Remove MLMarkupLanguageParser import and union types
* Remove deprecated 'parser' in parserMod check
* Update test mock to use Parser class instance

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- The end-tag rule now checks tagCloseChar for
  self-closing detection instead of the removed selfClosingSolidus
  property.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Multiple breaking changes to DOM API:

MLToken:

- Compute end positions via getEndCol/getEndLine helpers
  instead of storing them as private fields
- Use \_astToken.offset/line/col directly

MLElement:

- Remove selfClosingSolidus property
- Add blockBehavior: MLASTBlockBehavior | null

MLBlock:

- Replace conditionalType with blockBehavior property

Node traversal:

- Use blockBehavior?.type instead of conditionalType

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Adapt to renamed token properties and remove
  selfClosingSolidus test.

* Token property access: startOffset -> offset, startLine -> line,
  startCol -> col
* Replace selfClosingSolidus check with tagCloseChar
* Remove selfClosingSolidus test case

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Adapt to renamed token properties and add
  blockBehavior to visitElement calls.

* Token property access: startOffset -> offset, startLine -> line,
  startCol -> col
* Update test assertions for new property names
* Add blockBehavior: null to element creation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Replace conditionalType with blockBehavior objects
  containing type and expression fields. Update token property
  access from startOffset to offset in parse-block.ts.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Replace startOffset/endOffset with offset and
  offset + raw.length in flattenNodes comment handling.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Replace conditionalType reference with
  blockBehavior in TODO comment.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Adapt to renamed MLASTToken properties.

* Use getEndPosition() for ghost element position calculation
* Update test assertions: startCol -> col, startOffset -> offset,
  startLine -> line
* Remove endOffset/endLine/endCol assertions from tests

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Update Token type and parser internals for
  simplified AST token properties.

Token type property renames:

- startOffset -> offset
- startLine -> line
- startCol -> col

Parser changes:

- createToken() no longer produces endOffset/endLine/endCol
- visitPsBlock() parameter: conditionalType -> blockBehavior
- visitElement() accepts blockBehavior option
- Remove selfClosingSolidus token generation
- Add getEndPosition() helper to get-location.ts

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Multiple breaking changes to AST interfaces:

Token property renames (MLASTToken):

- startOffset -> offset
- startLine -> line
- startCol -> col
- Remove endOffset, endLine, endCol (derive via helpers)

Element changes (MLASTElement):

- Remove selfClosingSolidus property
- Add blockBehavior: MLASTBlockBehavior | null

Block changes (MLASTPreprocessorSpecificBlock):

- Remove conditionalType property
- Add blockBehavior: MLASTBlockBehavior | null

New types:

- MLASTBlockBehavior interface (type + expression)
- MLASTBlockBehaviorType (replaces MLASTPreprocessorSpecificBlockConditionalType)

Removed deprecated types:

- MLMarkupLanguageParser interface
- Parse type alias

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
