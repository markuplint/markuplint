# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

### Bug Fixes

- add no-aria-hidden-on-hidden-until-found rule (closes [#3999](https://github.com/markuplint/markuplint/issues/3999)) ([#4017](https://github.com/markuplint/markuplint/issues/4017)) ([3dfb300](https://github.com/markuplint/markuplint/commit/3dfb3001dc66452918d5cebbb071244b68779b30))
- resolveConfig(false) crashes with inline config (not a file path) ([#4018](https://github.com/markuplint/markuplint/issues/4018)) ([7e38b64](https://github.com/markuplint/markuplint/commit/7e38b64caa8cca69009ee765e4aada37fc48c559)), closes [#4015](https://github.com/markuplint/markuplint/issues/4015) [#4015](https://github.com/markuplint/markuplint/issues/4015)

### Features

- split rule-deprecation notices out of config-error ([#4013](https://github.com/markuplint/markuplint/issues/4013)) ([812e6f3](https://github.com/markuplint/markuplint/commit/812e6f356839af8f257cfd91e6b16cfdfdd7cf33))

### Performance Improvements

- share ConfigProvider across a run's files, fix latent overrides caching bug ([#4016](https://github.com/markuplint/markuplint/issues/4016)) ([fcc1875](https://github.com/markuplint/markuplint/commit/fcc1875b1a984a5ef1bb36aa04e7b3522fefc58e)), closes [#3997](https://github.com/markuplint/markuplint/issues/3997) [#3997](https://github.com/markuplint/markuplint/issues/3997)

### BREAKING CHANGES

- `ConfigProvider#resolve(targetFile, names, false)` no longer
  clears the provider's store/cache/plugin-resolution caches by itself. Callers
  that relied on `cache: false` alone to force a fresh re-read must now call
  the new `ConfigProvider#invalidate()` first.
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

- **astro-parser:** discriminate astro-eslint-parser ParseError from Tier 1 SyntaxError ([f961bf8](https://github.com/markuplint/markuplint/commit/f961bf8a89e3713565b06ff51bd214e6d69dea3e))
- **astro-parser:** preserve spread attributes containing TypeScript and expression-child siblings ([0e4c64d](https://github.com/markuplint/markuplint/commit/0e4c64d90f77f9350a4895f24ba07ec90eda6546)), closes [#3856](https://github.com/markuplint/markuplint/issues/3856)
- **astro-parser:** stop surfacing non-fatal Astro diagnostics as parse errors ([3a2c262](https://github.com/markuplint/markuplint/commit/3a2c262316e58196838ab075d5a554751cd976ac)), closes [#3834](https://github.com/markuplint/markuplint/issues/3834) [#3823](https://github.com/markuplint/markuplint/issues/3823)
- drop the min/max ordering exclusion — HTML LS mandates the ordering ([9315931](https://github.com/markuplint/markuplint/commit/9315931c0764001e783a067fcfcbb29cabe46647))
- **file-resolver:** make generalImport() OS-independent for POSIX absolute paths ([23aa492](https://github.com/markuplint/markuplint/commit/23aa492202a4b305022651210d9fc413e9baef2d)), closes [#3841](https://github.com/markuplint/markuplint/issues/3841) [#3843](https://github.com/markuplint/markuplint/issues/3843) [#3840](https://github.com/markuplint/markuplint/issues/3840)
- **github:** derive sandbox Yarn version from root packageManager ([0a89270](https://github.com/markuplint/markuplint/commit/0a892703ccf67d5e118c7e14498aa9a60ba033ee)), closes [#3758](https://github.com/markuplint/markuplint/issues/3758)
- **html-spec:** condition link[disabled] and require title on alternate+stylesheet ([cc56f78](https://github.com/markuplint/markuplint/commit/cc56f78bef8dbc6a1d63cf8acdddab52b86fce76))
- **html-spec:** div in dl allows exactly one dt+dd group per HTML LS ([6f344bb](https://github.com/markuplint/markuplint/commit/6f344bbc72bc82dbe2d1ebf05600a5fce9838de1))
- **html-spec:** drop case-insensitive flag from input[name] isindex pattern ([6cd6173](https://github.com/markuplint/markuplint/commit/6cd617379f5c8627e3192e819cf0c9406388da0d))
- **html-spec:** enforce non-empty title on alternate stylesheet link ([380da48](https://github.com/markuplint/markuplint/commit/380da48eeda19d1d672de466e389f76c373a8848))
- **html-spec:** enforce script attr applicability table per HTML LS 4.12.1 ([5331d2c](https://github.com/markuplint/markuplint/commit/5331d2cc7bcc6e7038515487f288f9cd00478b20)), closes [#3648](https://github.com/markuplint/markuplint/issues/3648)
- **html-spec:** forbid aria-expanded / aria-pressed on summary in details ([#3927](https://github.com/markuplint/markuplint/issues/3927)) ([92efa50](https://github.com/markuplint/markuplint/commit/92efa500ff6033d0bb82f816cbc27090afb5dbfe))
- **html-spec:** forbid input[name="isindex"] ([eb770e8](https://github.com/markuplint/markuplint/commit/eb770e8057a93d8e74da29c1855fb6bdadf47852))
- **html-spec:** forbid nested svg|a per SVG2 §17.6 ([d18f1bf](https://github.com/markuplint/markuplint/commit/d18f1bf691ecab30482a9e30f52d5196367dedf4))
- **html-spec:** mark separator aria-valuenow as focusable-conditional ([386b16c](https://github.com/markuplint/markuplint/commit/386b16c82795256224da35c01b95a85dc1ea727f)), closes [#3682](https://github.com/markuplint/markuplint/issues/3682)
- **html-spec:** preserve deprecated flags dropped by MDN scrape ([#3995](https://github.com/markuplint/markuplint/issues/3995)) ([d38ebfe](https://github.com/markuplint/markuplint/commit/d38ebfe2625102ed53809302b4fc6d67c88a7a9f)), closes [#3981](https://github.com/markuplint/markuplint/issues/3981)
- **html-spec:** restore deprecated attribute flags lost to MDN's Baseline badge rename ([#4003](https://github.com/markuplint/markuplint/issues/4003)) ([c5c91b5](https://github.com/markuplint/markuplint/commit/c5c91b581606ffb02816fcd784c5b8cc9167c465)), closes [#3994](https://github.com/markuplint/markuplint/issues/3994) [#3995](https://github.com/markuplint/markuplint/issues/3995)
- **html-spec:** route media= attribute through MediaQueryList type checker ([e86d8c8](https://github.com/markuplint/markuplint/commit/e86d8c88961b4669fe36b7c306b4b0e722abcda4)), closes [#3850](https://github.com/markuplint/markuplint/issues/3850)
- **html-spec:** tighten itemref uniqueness and itemtype empty handling ([9ba05bf](https://github.com/markuplint/markuplint/commit/9ba05bff5e60df25fd2ac887f32349088e284009))
- **html-spec:** tighten MathML element content models per MathML Core ([2b1abb4](https://github.com/markuplint/markuplint/commit/2b1abb44d14015c7602d74947eb8f79dde41cf09)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **html-spec:** tighten progress[value] lower bound and img[sizes]/srcset pairing ([74ac375](https://github.com/markuplint/markuplint/commit/74ac37541e24269f5ad10f740a7dc0dbe525c45c))
- **html-spec:** tighten script attribute conditions per HTML LS ([9285373](https://github.com/markuplint/markuplint/commit/92853738945f5b5a998455d48e9a0cddce07566f))
- **html-spec:** tighten source[sizes] to also require srcset ([71d3dd1](https://github.com/markuplint/markuplint/commit/71d3dd18d22a5b08e7c3ac9900d05f4c2d3af3b5))
- **html-spec:** tighten URL attribute types and required-attribute markers ([a946b43](https://github.com/markuplint/markuplint/commit/a946b433c28974db90e860dd101a5cfe016f7d1b))
- **html-spec:** video[poster] is NonEmptyURL (HTML LS §4.8.9) ([ed00089](https://github.com/markuplint/markuplint/commit/ed000898669da831b664a54e26130c57cc40db97))
- **markuplint:** report post-fix violations for exit code and suppressions ([03855d6](https://github.com/markuplint/markuplint/commit/03855d6641ae736b65994fa6123e91779d2eb41e)), closes [#3890](https://github.com/markuplint/markuplint/issues/3890)
- **markuplint:** stop repeating config-error messages once per file ([#4007](https://github.com/markuplint/markuplint/issues/4007)) ([466193d](https://github.com/markuplint/markuplint/commit/466193d286628f69e0d99fc8b2f66028523025aa)), closes [#4006](https://github.com/markuplint/markuplint/issues/4006)
- **ml-config:** restore `oneOf` in `rules`/`baseRules` of `config.schema.json` ([e9628e6](https://github.com/markuplint/markuplint/commit/e9628e60c0e67b76666a386112a4600d4d612c6a)), closes [#3786](https://github.com/markuplint/markuplint/issues/3786) [#3743](https://github.com/markuplint/markuplint/issues/3743)
- **ml-core:** look up dedupe contract under both alias and base rule names ([a5dde7e](https://github.com/markuplint/markuplint/commit/a5dde7e23a12a43d976fbfaa1cc3dec67265447e)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844) [#3871](https://github.com/markuplint/markuplint/issues/3871)
- **ml-core:** re-verify fixed code and detect N-pass fix cycles ([8c96516](https://github.com/markuplint/markuplint/commit/8c96516d8057acdcf06dc279c2183390f0966e98)), closes [#3890](https://github.com/markuplint/markuplint/issues/3890) [#3891](https://github.com/markuplint/markuplint/issues/3891)
- **ml-core:** stop accumulating duplicate mapping errors across setCode ([2874d5b](https://github.com/markuplint/markuplint/commit/2874d5b60b24ccc501f7dae1f6ab25fb6e51e58b)), closes [#3900](https://github.com/markuplint/markuplint/issues/3900)
- **parser-utils:** handle raw-text element body in parseCodeFragment per HTML LS §13.2.5.1 ([4a1b0f7](https://github.com/markuplint/markuplint/commit/4a1b0f701c5c0eec91b325c4f3a9f9fb773766e8)), closes [#3825](https://github.com/markuplint/markuplint/issues/3825)
- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **rules:** apply always-matching check to srcset-less sources ([2b6960d](https://github.com/markuplint/markuplint/commit/2b6960d59f6be3b35cc44466d549813c9c14f2c3))
- **rules:** apply deprecated-element and no-unsupported-features to pretendered components ([9becedd](https://github.com/markuplint/markuplint/commit/9becedd2e6403721fe57cc4624673d46343b811b)), closes [#3740](https://github.com/markuplint/markuplint/issues/3740)
- **rules:** flag placeholder-label-option on empty required select ([#3936](https://github.com/markuplint/markuplint/issues/3936)) ([8a80802](https://github.com/markuplint/markuplint/commit/8a80802fb27010f4cba5a604857ee85608398caa))
- **rules:** heading-levels must only fire when preceded by another heading ([34d380c](https://github.com/markuplint/markuplint/commit/34d380c4ada1315a389a18357feabb93daab2c93))
- **rules:** keep transparent element itself in parent content-model check ([#3960](https://github.com/markuplint/markuplint/issues/3960)) ([88c0412](https://github.com/markuplint/markuplint/commit/88c04125a0a582436d865c7463c3d52b528e529e)), closes [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3838](https://github.com/markuplint/markuplint/issues/3838)
- **rules:** log when the permitted-contents transparent pattern cap is exceeded ([3d26ed4](https://github.com/markuplint/markuplint/commit/3d26ed4018a6a219fe0f69864d2d1e39cd3130c7)), closes [#3895](https://github.com/markuplint/markuplint/issues/3895)
- **rules:** only require aria-valuenow on focusable separators ([fe97162](https://github.com/markuplint/markuplint/commit/fe971625962a25540a1cd0aff790fd882541da30)), closes [#3682](https://github.com/markuplint/markuplint/issues/3682)
- **rules:** preserve [invalid-attr-valid-007] structure and mark breaking change inline ([de27044](https://github.com/markuplint/markuplint/commit/de27044fd64526ddcdf345795dca17ebb8456cf1))
- **rules:** quote input-button-non-empty-value description in YAML frontmatter ([d289824](https://github.com/markuplint/markuplint/commit/d289824ed6b394d4a130de3f6ac819e568b06761))
- **rules:** rename test fixture id "myform" to "form1" for cspell ([a9a1194](https://github.com/markuplint/markuplint/commit/a9a11943809e434d81a724aad516f18e29df794b))
- **rules:** replace "unparseable" with "unparsable" for cspell ([fb63696](https://github.com/markuplint/markuplint/commit/fb6369612fcdae0f4f12a3581e467fe92faaad96))
- **rules:** script-content guards Tier 1 errors and covers scopes specifier-map branches ([7004652](https://github.com/markuplint/markuplint/commit/700465223ad504b7b014d0314fe6a1c456ad20f7))
- **rules:** skip condition-disallow when a referenced attr value is dynamic ([f04557d](https://github.com/markuplint/markuplint/commit/f04557d2f5526ad0b47a3ffc2691ccba9a67fa49))
- **rules:** srcset-sizes-constraint now covers source-in-picture for w-without-sizes ([fb442a6](https://github.com/markuplint/markuplint/commit/fb442a6c3a9e2d4e20f1adcad1723621fbaa3c2c))
- **rules:** strip only ASCII whitespace in always-matching media check ([e309e97](https://github.com/markuplint/markuplint/commit/e309e97bc4ba0bb2cf66b2c07a17c826b544482c))
- **rules:** surface disallowed-element reason via reasonOnly (close [#3815](https://github.com/markuplint/markuplint/issues/3815)) ([#3986](https://github.com/markuplint/markuplint/issues/3986)) ([0142cec](https://github.com/markuplint/markuplint/commit/0142cec667f70fee086f2a6e06d7a26e66bda380))
- **rules:** tighten new conformance rules from QA review ([3096626](https://github.com/markuplint/markuplint/commit/3096626bcf34c1897c8fb77cc0ff6a4f3d4c9fb4))
- **rules:** wrap attr-bearing tags in description so MDX accepts them ([1ad1225](https://github.com/markuplint/markuplint/commit/1ad12256f67246d6ec18d5b97078ef1e2a85fd85))
- **selector:** match HTML attribute names ASCII case-insensitively ([b7fa271](https://github.com/markuplint/markuplint/commit/b7fa271b9a195f438afbd1d7e9fe3eeecc35665e))
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
- **vscode:** convert absolute paths to file:// URLs before import ([b684b2f](https://github.com/markuplint/markuplint/commit/b684b2fb25833163e812408e013c070f621fb695)), closes [#3795](https://github.com/markuplint/markuplint/issues/3795)
- **vscode:** make toImportSpecifier OS-independent for POSIX absolute paths ([61da724](https://github.com/markuplint/markuplint/commit/61da7244038b686f9f6ed7536948179ce45936e5)), closes [#3841](https://github.com/markuplint/markuplint/issues/3841) [#3836](https://github.com/markuplint/markuplint/issues/3836) [#3840](https://github.com/markuplint/markuplint/issues/3840) [#3840](https://github.com/markuplint/markuplint/issues/3840) [#3842](https://github.com/markuplint/markuplint/issues/3842)

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

- feat(markuplint)!: stop forcing severity.parseError default in CLI ([79ff00b](https://github.com/markuplint/markuplint/commit/79ff00b5d068802f4d7e0d8d30ee63e55b8bc7f1)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- feat(rules)!: enforce ARIA naming prohibition on autonomous custom elements ([7e01a4b](https://github.com/markuplint/markuplint/commit/7e01a4b691df643255ad5b1e6542688198b01a01))
- fix(ml-core)!: reject pretender on standard HTML elements ([0576425](https://github.com/markuplint/markuplint/commit/0576425baf9b78141523bcd0e4a102062b96bc81)), closes [#3740](https://github.com/markuplint/markuplint/issues/3740)
- fix(rules)!: scope invalid-attr virtual rules to narrow checks (#3803) ([77acb1d](https://github.com/markuplint/markuplint/commit/77acb1d1ac7cadd35203fa209ca016f802775b59)), closes [#3803](https://github.com/markuplint/markuplint/issues/3803)
- fix(config-presets)!: enable invalid-attr in html-standard, simplify rdfa nodeRule (#3803) ([2114933](https://github.com/markuplint/markuplint/commit/2114933f90640110baf8dcc85f34cab73b412bdf)), closes [#3803](https://github.com/markuplint/markuplint/issues/3803)

### Features

- add --audit mode to bench xref CLI and tighten config invariants ([5d1d706](https://github.com/markuplint/markuplint/commit/5d1d7060fc7cab1d9a11a8e452f5d1865e9bc5f5)), closes [#3619](https://github.com/markuplint/markuplint/issues/3619) [#3637](https://github.com/markuplint/markuplint/issues/3637) [#3634](https://github.com/markuplint/markuplint/issues/3634) [#3634](https://github.com/markuplint/markuplint/issues/3634)
- add `pretenders.auto` for on-demand import-graph resolution ([#3962](https://github.com/markuplint/markuplint/issues/3962)) ([5870671](https://github.com/markuplint/markuplint/commit/58706711a20c12cff080d49359f3f6443345eca3)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3957](https://github.com/markuplint/markuplint/issues/3957) [#3959](https://github.com/markuplint/markuplint/issues/3959) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- add benchmark cross-reference CLI for related GitHub issues ([5ee6f22](https://github.com/markuplint/markuplint/commit/5ee6f22416e494c572aa76c9eafb3ca5462c09b5)), closes [#3684](https://github.com/markuplint/markuplint/issues/3684) [#3634](https://github.com/markuplint/markuplint/issues/3634)
- **config-presets:** add 6 new conformance rules to html-standard preset ([595e3b9](https://github.com/markuplint/markuplint/commit/595e3b91a2e4c8c33a8fd1c9d179b3a9dc8be054))
- **config-presets:** forbid <base> after <link> or <script> in <head> ([#3925](https://github.com/markuplint/markuplint/issues/3925)) ([ceb892d](https://github.com/markuplint/markuplint/commit/ceb892d64772d459a6bd9564684218e3afbdec2e))
- **config-presets:** wire form-attr-references-form + no-refer-to-non-existent-id ([8fad30f](https://github.com/markuplint/markuplint/commit/8fad30f79b679f5581f368de1f187cfad4870731))
- **html-parser:** honour parserOptions.documentMode ([36aa8b9](https://github.com/markuplint/markuplint/commit/36aa8b9eea2d28f7799a77164b20e635b4be947d)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **html-parser:** wire parse5 onParseError into MLASTDocument.parseErrors ([e3d0927](https://github.com/markuplint/markuplint/commit/e3d09278015d59dd33753d3e64ab05d3d0814bc7)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **html-spec:** add shadowrootslotassignment + customelementregistry on template ([96df2ff](https://github.com/markuplint/markuplint/commit/96df2ffb337648ccea0e008c0ca944254e6b2007))
- **html-spec:** enforce X-UA-Compatible content="IE=edge" ([#3929](https://github.com/markuplint/markuplint/issues/3929)) ([2638fba](https://github.com/markuplint/markuplint/commit/2638fba826a489ad745ee30c4b8ed195b2362403)), closes [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3734](https://github.com/markuplint/markuplint/issues/3734)
- **html-spec:** forbid aria-expanded on button[popovertarget] ([3bdc265](https://github.com/markuplint/markuplint/commit/3bdc2652519ff106e8b67512bd352be1b6e8fe68)), closes [#3735](https://github.com/markuplint/markuplint/issues/3735)
- **html-spec:** forbid dir="auto" on bdo per HTML LS ([71bba9e](https://github.com/markuplint/markuplint/commit/71bba9e9f2be556ac3c256d37e035548bd3ccbd2))
- **html-spec:** harden generator validation and summarize spec changes ([2297699](https://github.com/markuplint/markuplint/commit/229769996539658d4d9a3d76a1bb60df4754490d)), closes [#3894](https://github.com/markuplint/markuplint/issues/3894) [#3897](https://github.com/markuplint/markuplint/issues/3897)
- **html-spec:** narrow del/ins datetime attribute to DateStringWithOptionalTime ([fd8848d](https://github.com/markuplint/markuplint/commit/fd8848d0bc97270ddba425faf81a110d755bd524))
- **html-spec:** require as attribute on link[rel=preload] ([3b11c49](https://github.com/markuplint/markuplint/commit/3b11c499c642af51587464fa43c0b162c50bc0ed))
- **html-spec:** require itemscope/itemtype for itemid and itemtype ([42f8fb9](https://github.com/markuplint/markuplint/commit/42f8fb9a292f491da21df63b852c5e3fd73c5c7e)), closes [#3733](https://github.com/markuplint/markuplint/issues/3733)
- **html-spec:** split meta[content] by http-equiv value ([e055f32](https://github.com/markuplint/markuplint/commit/e055f32822b86618f658971085c363d79777ce65)), closes [#3598](https://github.com/markuplint/markuplint/issues/3598) [#3734](https://github.com/markuplint/markuplint/issues/3734)
- **html-spec:** tighten input min/max + progress max value types ([3b0749d](https://github.com/markuplint/markuplint/commit/3b0749d212a651e238ac111f81740d93fe6ee5d4))
- **html-spec:** type svg:script async/defer attributes as Boolean ([#3961](https://github.com/markuplint/markuplint/issues/3961)) ([65f8a1d](https://github.com/markuplint/markuplint/commit/65f8a1da82e2c2d0ffa4ab742e792fdbfbfc2e90))
- **html-spec:** wire NonEmptyURL / AbsoluteURLOrEmpty into URL-typed attributes ([8ed5116](https://github.com/markuplint/markuplint/commit/8ed51169c688853d5bba21a0cedd82b35bc5eb96)), closes [#3868](https://github.com/markuplint/markuplint/issues/3868)
- **markdown-parser,pug-parser:** force fragment parsing for embedded HTML ([57c4172](https://github.com/markuplint/markuplint/commit/57c4172d5a68adb7e20a4f4e4d8dbe802983e3ca)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **markdown-parser,pug-parser:** forward embedded HTML parseErrors to outer document ([9ec7988](https://github.com/markuplint/markuplint/commit/9ec79882840cbedd76c5b8f774ff10c876d2c858)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-ast:** add documentMode to ParserOptions ([530493e](https://github.com/markuplint/markuplint/commit/530493e7f99eb27dd2f420666474e233db450c26)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-ast:** add MLASTParseError + MLASTParseErrorCode types and parseErrors field ([be34fbd](https://github.com/markuplint/markuplint/commit/be34fbd36ba7fb36b0a07cd6e865c8d81d8752ae)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-config:** accept per-code severity for severity.parseError ([7a0ef81](https://github.com/markuplint/markuplint/commit/7a0ef81443b9d9e004eff153369134bc6d812076)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-core:** hook-based dedupe for parse-error channel via mirrorsParseErrorCodes ([6a36f17](https://github.com/markuplint/markuplint/commit/6a36f17d292a2400494a3670c93cb2f02999b48b)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-core:** surface non-fatal parser errors via opt-in parse-error channel ([d715fbe](https://github.com/markuplint/markuplint/commit/d715fbe586c478b98472a570b3175873cf244aef)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-spec:** add requiredCondition field to ARIARoleOwnedProperties ([6867215](https://github.com/markuplint/markuplint/commit/686721537b3d9b141dac12666a2796635d320151)), closes [#3682](https://github.com/markuplint/markuplint/issues/3682)
- parallelise bench xref audit and gate it via a GitHub Action ([550c100](https://github.com/markuplint/markuplint/commit/550c1001f47bbc21fbe9eac056c5dc914337ec1d))
- **parser-utils:** introduce accumulateParseErrors() for embedded parser delegation ([49e15d6](https://github.com/markuplint/markuplint/commit/49e15d6f528282ca145e77baf03ae8f6561b2b09)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **parser-utils:** propagate Tokenized.parseErrors onto MLASTDocument ([37c8430](https://github.com/markuplint/markuplint/commit/37c8430f454d24d691e093fda9e9fb71b658b4d2)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **rules:** add form-attr-references-form rule ([6b541f0](https://github.com/markuplint/markuplint/commit/6b541f032b76c3712c99ea35596b6b0aa79b6137))
- **rules:** add input-button-non-empty-value rule ([2cc73dd](https://github.com/markuplint/markuplint/commit/2cc73ddd0f874fae9faf005f498d73fa364b682c))
- **rules:** add input-file-empty-value rule ([228cbd7](https://github.com/markuplint/markuplint/commit/228cbd752956d3df8f525e4f19f9278a44d87160))
- **rules:** add input-list-references-datalist rule ([#3931](https://github.com/markuplint/markuplint/issues/3931)) ([bf4ef54](https://github.com/markuplint/markuplint/commit/bf4ef54a1b2937ecbe05fbe5121ddfe199781a95))
- **rules:** add itemprop-requires-itemscope rule ([2b4cba4](https://github.com/markuplint/markuplint/commit/2b4cba4a3afe205f1b4c96744e8d5115ea3bc0ee)), closes [#3852](https://github.com/markuplint/markuplint/issues/3852)
- **rules:** add label-for-references-labelable rule ([#3932](https://github.com/markuplint/markuplint/issues/3932)) ([3713e6b](https://github.com/markuplint/markuplint/commit/3713e6b435a76fe03a941a36a5e33c0ab06c9a80)), closes [#3918](https://github.com/markuplint/markuplint/issues/3918)
- **rules:** add label-no-multiple-controls rule ([5da3f85](https://github.com/markuplint/markuplint/commit/5da3f8523dd6ffd9f44ea73d9012952aad85d821))
- **rules:** add map-id-name-match rule ([1472daf](https://github.com/markuplint/markuplint/commit/1472daf62470bf56c4cb326ab47dc43ba87a8cb3))
- **rules:** add meter-value-bounds rule ([82cb9a0](https://github.com/markuplint/markuplint/commit/82cb9a01edaf574f5b3b1e8e8ce531d0fab21f1c))
- **rules:** add no-extra-selected-options rule ([3ea75ac](https://github.com/markuplint/markuplint/commit/3ea75ac0b6850c36d5419924b18c1002dfb864a9))
- **rules:** add progress-value-bounds rule ([#3926](https://github.com/markuplint/markuplint/issues/3926)) ([1e259ec](https://github.com/markuplint/markuplint/commit/1e259ec9929ceb3c7ac5864ce2807420646e9602))
- **rules:** add script-content rule for `<script type=importmap>` JSON validation ([c635970](https://github.com/markuplint/markuplint/commit/c6359707af6b37abb0bca130e880cb1e9b5b9005))
- **rules:** add wai-aria-tab-requires-tabpanel rule ([#3955](https://github.com/markuplint/markuplint/issues/3955)) ([eac9abe](https://github.com/markuplint/markuplint/commit/eac9abef20ef304c3da2114849686b9cf0733942))
- **rules:** character-reference consumes parse5 malformed-reference codes via parseErrors hook ([a33bb4e](https://github.com/markuplint/markuplint/commit/a33bb4e6674c23ae06b6a12d45ace1c2e954b3be)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **rules:** declare mirrorsParseErrorCodes on attr-duplication / doctype / no-orphaned-end-tag ([06893f0](https://github.com/markuplint/markuplint/commit/06893f07584be548c9719153cfae288bd2fdf83e)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **rules:** detect always-matching source in srcset-sizes-constraint ([a11199c](https://github.com/markuplint/markuplint/commit/a11199cb13011a775630788a80820ade189b21bd))
- **rules:** disallow aria-\* on elements where html-spec says properties: false ([1850ee3](https://github.com/markuplint/markuplint/commit/1850ee3a854d25fd5291d4c2a555b8be3f99f245)), closes [#3735](https://github.com/markuplint/markuplint/issues/3735) [#3735](https://github.com/markuplint/markuplint/issues/3735)
- **rules:** extend label-no-multiple-controls for external labeled control ([#3933](https://github.com/markuplint/markuplint/issues/3933)) ([392f051](https://github.com/markuplint/markuplint/commit/392f051c0d7ee8be8f3dc12afae6a902c6c8ea2b))
- **rules:** report HTML LS table model errors in table-row-column-alignment ([#3953](https://github.com/markuplint/markuplint/issues/3953)) ([bacdcd6](https://github.com/markuplint/markuplint/commit/bacdcd697f76300153388f5b1cabaa8504f08d1f)), closes [#3916](https://github.com/markuplint/markuplint/issues/3916) [#3915](https://github.com/markuplint/markuplint/issues/3915) [#3916](https://github.com/markuplint/markuplint/issues/3916) [#3915](https://github.com/markuplint/markuplint/issues/3915)
- **rules:** script-content validates the integrity top-level key ([cc1a050](https://github.com/markuplint/markuplint/commit/cc1a0504ab0664c96ae326e6c5580d4fe04fed58))
- **rules:** surface parse5-silent HTML LS parse errors (close nu-only umbrella [#3943](https://github.com/markuplint/markuplint/issues/3943)) ([#3980](https://github.com/markuplint/markuplint/issues/3980)) ([89951fa](https://github.com/markuplint/markuplint/commit/89951fa274007d56370510cb0cf11aead808ce13))
- **rules:** validate `<script type="speculationrules">` content ([d000a84](https://github.com/markuplint/markuplint/commit/d000a84badfc359c11258f8d46230c44a254cc05)), closes [#3882](https://github.com/markuplint/markuplint/issues/3882)
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
- wire script-content into preset, bench, and default-rules ([dd0507a](https://github.com/markuplint/markuplint/commit/dd0507a9f54fcff25dba666a1c8fbc082489bdc8))

### BREAKING CHANGES

- **rules:** with no alias coverage.
- CLI invocations that previously relied on the implicit
  \`severity.parseError: 'error'\` default for _fatal_ parser errors are
  unaffected — fatal errors continue to emit at \`'error'\` regardless. But
  projects that lint malformed HTML and expected non-fatal parse5 events to
  show up by default must now pass \`--severity-parse-error error\` (or set
  \`severity.parseError\` in their config).
- **rules:** is visible in the test source, not only in git history.

Also drop the duplicate `//user:pass@sample.com/path/to` case from
[invalid-attr-invalid-044]; valid-007 now carries the canonical
assertion for that URL, while invalid-044 covers the empty-userinfo
variant (`http://@host`) and the other six URL LS categories.

- <my-widget aria-label="x"> now reports an error
  under wai-aria-disallowed-props. Add an explicit role
  (<my-widget role="button" aria-label="x">) or remove the naming
  attribute. Affects autonomous custom elements only;
  customised-built-in elements (<button is="x-y">) are unaffected.

Source: https://w3c.github.io/html-aria/#docconformance

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>

- `pretenders` config entries whose selector matches a
  standard HTML element are now ignored. Configurations that previously
  relied on `<marquee as="div">` to suppress markuplint violations must
  remove the entry; the original element is now linted on its own merits.
- Named rules wrapping `invalid-attr` (e.g., `a11y/no-accesskey`)
  only perform their configured allow/disallow checks and no longer fall back to
  HTML-spec validation. To retain spec validation, extend `markuplint:html-standard`
  or set `"invalid-attr": true` in your config.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

- `markuplint:html-standard` now enables the base `invalid-attr` rule.
  `rdfa/meta-property` is no longer a named rule — override behavior is preserved by
  the unnamed nodeRule. Users who disabled this named rule via
  `rules: { "rdfa/meta-property": false }` should remove that entry.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package markuplint-packages

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

- add "alpinejs" to cspell dictionary ([96982f8](https://github.com/markuplint/markuplint/commit/96982f862b0951b55f37b4e48d3751e07fe1fc0f))
- **deps:** add eslint-plugin-regexp as devDependency for oxlint JS Plugins ([af14db6](https://github.com/markuplint/markuplint/commit/af14db68b98594172e29978a0d3a6f15f2c525f6))
- **deps:** pin oxlint and oxfmt versions without caret ([c37308a](https://github.com/markuplint/markuplint/commit/c37308ada661c859bc6bd04385cf43a7860a19a3))
- **deps:** update yarn.lock for pinned oxlint/oxfmt versions ([d95b57d](https://github.com/markuplint/markuplint/commit/d95b57d14c237c931f19a4f47b444b8f232268dc))
- **html-spec:** add dir as required attribute for bdo element ([81a6c1f](https://github.com/markuplint/markuplint/commit/81a6c1f40630b3b9a904d380aed47042dfb90972))
- **html-spec:** change dl content model from oneOrMore to zeroOrMore groups ([e29f6e4](https://github.com/markuplint/markuplint/commit/e29f6e4beb6cee1143d2aa4f53b770d97624dd0a)), closes [#3592](https://github.com/markuplint/markuplint/issues/3592)
- **html-spec:** change optgroup label type from Any to NoEmptyAny ([c6b0e88](https://github.com/markuplint/markuplint/commit/c6b0e887cbb7576e9139a269c98b8718bcaffb18))
- **html-spec:** correct permittedRoles for input[type=button/image/reset/submit] ([054e8e2](https://github.com/markuplint/markuplint/commit/054e8e2b1ca9c1b85fa5a0bcd18f72a22669f4a5)), closes [#3588](https://github.com/markuplint/markuplint/issues/3588)
- **html-spec:** override MDN incorrect experimental flag on audio loading attribute ([09d5898](https://github.com/markuplint/markuplint/commit/09d5898256ef0880bcdce9d8a514fbcae6b4d226))
- **html-spec:** override MDN incorrect experimental flag on video loading attribute ([52def75](https://github.com/markuplint/markuplint/commit/52def759157d046cacc0660422db188e4d8da753)), closes [#3697](https://github.com/markuplint/markuplint/issues/3697)
- **html-spec:** remove global attr overrides that drop type definitions ([6ff2f0d](https://github.com/markuplint/markuplint/commit/6ff2f0d2ac8c0410b90af5e9ccb6be126ec96c39))
- **html-spec:** restore ARIA 1.3 role name extraction ([01b9ce3](https://github.com/markuplint/markuplint/commit/01b9ce350b472e9f37f04238be446c3898e317a8))
- **lint:** add oxlint/oxfmt terms to cspell dictionary ([66d1702](https://github.com/markuplint/markuplint/commit/66d1702a55ac6906b6688cdb50170d1eb7fe9d30))
- **markuplint:** add default export condition and re-export isFatalError ([55a990a](https://github.com/markuplint/markuplint/commit/55a990affeec62c23a96cf15b42327fcb867e809))
- **markuplint:** add missing status property to github-reporter test data ([bb7ba62](https://github.com/markuplint/markuplint/commit/bb7ba62e9350c173987f76de2741aaeb3ba0997b))
- **ml-core:** propagate base rule disable to virtual rules in nodeRules/childNodeRules ([06fa269](https://github.com/markuplint/markuplint/commit/06fa2695d43671adc1ebcadf1304aca44fd10919)), closes [#3578](https://github.com/markuplint/markuplint/issues/3578)
- **ml-spec:** apply optimizePermittedRoles to condition-specific overrides ([f6ad782](https://github.com/markuplint/markuplint/commit/f6ad7823c298011fb690cd3360392bc2893c05f2)), closes [#3724](https://github.com/markuplint/markuplint/issues/3724)
- **ml-spec:** back-port content-model fields to schema source ([835d4d8](https://github.com/markuplint/markuplint/commit/835d4d8e4aa6bc2329b087194748159a8c1f86f6))
- **ml-spec:** treat permittedRoles:false as forbidding all explicit roles ([098cc41](https://github.com/markuplint/markuplint/commit/098cc4167297599e7721bf88119af7d8f3c2df08)), closes [#3641](https://github.com/markuplint/markuplint/issues/3641)
- restore "unexist" and "unsetuped" to cspell dictionary ([5f90e65](https://github.com/markuplint/markuplint/commit/5f90e65edfc56fb778e8f91dcb677dfa9edb18b8))
- **rules:** allow zeroOrMore to match zero times in countPattern ([f5da340](https://github.com/markuplint/markuplint/commit/f5da340ac264c831ba0c74adfd039a1d0b6ff3fb)), closes [#3592](https://github.com/markuplint/markuplint/issues/3592)
- **rules:** apply permitted-contents user rule on pretended elements ([04c42d1](https://github.com/markuplint/markuplint/commit/04c42d165aabde754d6544486ca5d39ef4a868bc)), closes [#3739](https://github.com/markuplint/markuplint/issues/3739)
- **rules:** enforce descendantOf constraint in permitted-contents rule ([5375207](https://github.com/markuplint/markuplint/commit/5375207f169d26c65be6510f28c904d39454d08e))
- **rules:** preserve role name in permitted-roles message, dedupe with implicit-role ([3123cd6](https://github.com/markuplint/markuplint/commit/3123cd690e140e142a94c09d6948bb9cf0dfd23e)), closes [#3641](https://github.com/markuplint/markuplint/issues/3641) [#3641](https://github.com/markuplint/markuplint/issues/3641) [#3641](https://github.com/markuplint/markuplint/issues/3641)
- **rules:** update nu-validator config and exclude spec leniency cases ([c9cb5f7](https://github.com/markuplint/markuplint/commit/c9cb5f768fb2d95c13674dc408b325fb2ee3c874))
- skip hasinfo files in nu-validator benchmark (same as haswarn) ([b7d7e0a](https://github.com/markuplint/markuplint/commit/b7d7e0a85cb32b468ef84c0e3997073098178cb3))
- **types:** allow empty string for BCP47 type (lang="" is valid per HTML LS) ([ceba672](https://github.com/markuplint/markuplint/commit/ceba6726be6f34200bf54a2808c3eb893f31a032))
- **types:** back-port Pattern type variant to specific-schema source ([6f7466f](https://github.com/markuplint/markuplint/commit/6f7466fc320fa69842f1f7e201a7b637baa58d1a))
- **types:** reject zero and negative srcset descriptors ([5584d20](https://github.com/markuplint/markuplint/commit/5584d2089fe1dfe508d43601fa14aeff4e08b265))
- **types:** use spec-verbatim regex for Email validator ([b517a49](https://github.com/markuplint/markuplint/commit/b517a4926ff213bbbc1eea27583c463b1917b760))
- **vscode:** fix git blame porcelain parsing for repeated commits ([b5bb18d](https://github.com/markuplint/markuplint/commit/b5bb18d68b64f35228c7e352fd944afb284a6fe5))
- **vscode:** import isFatalError via markuplint/suppressions ([17226e4](https://github.com/markuplint/markuplint/commit/17226e4bd01adf8b7df7f7682d33cd28564ea5cd))
- **website:** add explicit anchor IDs to JA guide headings ([c3f8421](https://github.com/markuplint/markuplint/commit/c3f8421ded35956bcc415dd93e0417e19a03e632))
- **website:** fix remaining broken anchor in JA properties page ([28367bf](https://github.com/markuplint/markuplint/commit/28367bfa095669d86450b6cfd7f7bdafcfef8798))

- fix(parser-utils)!: align unquoted attribute value tokenizer with HTML spec ([5168c04](https://github.com/markuplint/markuplint/commit/5168c041a1d37a7080f12e3c7569b5bbacd5a2f1))
- refactor(html-spec)!: migrate spec-generator into html-spec and run via native TypeScript ([8f928cc](https://github.com/markuplint/markuplint/commit/8f928ccf17a959447f477eb4c3d0db13ab2ba730))
- build!: remove Prettier and replace with oxfmt ([2d1cf2b](https://github.com/markuplint/markuplint/commit/2d1cf2b06aa8f517769ddd58704cddf54537a2f4))
- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))
- feat(markuplint)!: remove deprecated autoLoad option and MLResultInfo_v1 interface ([4eb1d05](https://github.com/markuplint/markuplint/commit/4eb1d05eb2829019cd4073afa153a512b1c4c8fa))
- feat(file-resolver)!: remove deprecated autoLoad parameter from resolveRules ([71cab2d](https://github.com/markuplint/markuplint/commit/71cab2d5fe5bedb3e28b162666cbad3d0a2773ff))
- feat(ml-core)!: remove deprecated getIndent function ([7ab1a2d](https://github.com/markuplint/markuplint/commit/7ab1a2dae8f36002f4e5f3108a400bb9095db319))
- feat(parser-utils)!: remove deprecated getLine and getCol functions ([51cd7a2](https://github.com/markuplint/markuplint/commit/51cd7a28b7fcdd4a9d52d57f35c55b97b3b196fe))
- feat(types)!: remove deprecated Token.getLine and Token.getCol static methods ([fad012c](https://github.com/markuplint/markuplint/commit/fad012c9f1f7e5bb48b79ef639d4cefa61123c1c))

### Features

- add /list-rule-test slash command for rule test ID listing ([206979c](https://github.com/markuplint/markuplint/commit/206979c88c600edd6d8343b942831a7d7a20ffe9))
- **config-presets:** add document uniqueness rules to html-standard preset ([6ed848b](https://github.com/markuplint/markuplint/commit/6ed848bd800416d1220b9de95ece7a3d752d881f))
- **config-presets:** split a11y/wai-aria into 16 namedRuleGroup entries ([7ab707b](https://github.com/markuplint/markuplint/commit/7ab707b4ae1c1843a0576d31bf3fb20f0f5f7686))
- enable TypeScript type-checking during test execution ([f956179](https://github.com/markuplint/markuplint/commit/f956179628e6313e6486821792a53fb9127d72fb))
- **html-spec:** add conditional attribute constraints for script element ([9abbf95](https://github.com/markuplint/markuplint/commit/9abbf95c43d8bcedbfa19d0c09223a322967bc3b))
- **html-spec:** add conditional value types for input element ([#3598](https://github.com/markuplint/markuplint/issues/3598)) ([290be1c](https://github.com/markuplint/markuplint/commit/290be1cde53165f1f6165731bf2ec184b0c46b54))
- **html-spec:** add forbiddenAncestors for main, header, footer, address ([e51b745](https://github.com/markuplint/markuplint/commit/e51b745c0fd7662946b267b67f94b1bfbf95b89c))
- **html-spec:** add loading attribute type for audio and video elements ([12a03f7](https://github.com/markuplint/markuplint/commit/12a03f7252bfb8bae2bd427dbb9a553e2038ecb3)), closes [#3542](https://github.com/markuplint/markuplint/issues/3542)
- **html-spec:** add speculationrules to script type attribute enum ([3568ee6](https://github.com/markuplint/markuplint/commit/3568ee6012b3f30e3f913f346e000519939c1448))
- **html-spec:** add touch event handler attributes (ontouchstart, etc.) ([9be2b57](https://github.com/markuplint/markuplint/commit/9be2b57ea39ec33c7d3f24bca530a40b6e4d7708))
- **html-spec:** add uniqueAttrs for track default attribute ([ccafb65](https://github.com/markuplint/markuplint/commit/ccafb65fbda86e42f509566eb95798cfac271c11))
- **html-spec:** split link[as] enum by rel condition ([#3189](https://github.com/markuplint/markuplint/issues/3189)) ([6aa1fe8](https://github.com/markuplint/markuplint/commit/6aa1fe896223a3b7437e38a3c2b5092edefcd240))
- **html-spec:** use #nonEmptyText for title and option elements ([ede5d4c](https://github.com/markuplint/markuplint/commit/ede5d4c87c72b7e2e95f17799f3632eb9108feef))
- **i18n:** add "prohibited" keyword for naming prohibition messages ([87b4fca](https://github.com/markuplint/markuplint/commit/87b4fcaa17552e08d1c8eeeeab015f64bf953232))
- **markuplint:** add CLI summary output ([4743ba0](https://github.com/markuplint/markuplint/commit/4743ba0be7311288ea2b28fb9345567cf97c1a23))
- **markuplint:** add suppressions subpath export and editor severity downgrade ([362adef](https://github.com/markuplint/markuplint/commit/362adef1a040c66fec36c01bd8d8fcbe9a66c453))
- **ml-core:** propagate option overrides to virtual rules in nodeRules/childNodeRules ([9cb9521](https://github.com/markuplint/markuplint/commit/9cb9521fc1303c132f547ffd1e8c82b3b9099bef))
- **ml-spec:** add #nonEmptyText to Category type ([d60be3f](https://github.com/markuplint/markuplint/commit/d60be3f43bff6cc5d9c1cfa9dcdbe5d69f8697b8))
- **ml-spec:** add ConditionalAttributeType to Attribute.type union ([#3685](https://github.com/markuplint/markuplint/issues/3685)) ([a619a07](https://github.com/markuplint/markuplint/commit/a619a071d93566dd8aa7ab8dee2ed751c2e8756c)), closes [#3598](https://github.com/markuplint/markuplint/issues/3598) [#3189](https://github.com/markuplint/markuplint/issues/3189)
- **ml-spec:** add forbiddenAncestors field to ContentModel type ([5b32af5](https://github.com/markuplint/markuplint/commit/5b32af5ee7041843b63ca1542cb811d3192e8527))
- **ml-spec:** add uniqueAttrs field to ContentModel type ([d9e6f16](https://github.com/markuplint/markuplint/commit/d9e6f169888e92c9e8c85de884775cf026c2d1bf))
- **rules:** add #nonEmptyText matching to permitted-contents engine ([4b91cf3](https://github.com/markuplint/markuplint/commit/4b91cf37cb8d54b86e8bfe125276251f2d8cb97b))
- **rules:** add document uniqueness rules (autofocus, visible-main, charset) ([1befb20](https://github.com/markuplint/markuplint/commit/1befb2051015df7669fbd07da3fea3a0b6542a90))
- **rules:** check forbiddenAncestors in permitted-contents rule ([0633c05](https://github.com/markuplint/markuplint/commit/0633c05df91a2f51361a72efe8ebb2e604a53918))
- **rules:** check uniqueAttrs constraint in permitted-contents rule ([6b2cf6b](https://github.com/markuplint/markuplint/commit/6b2cf6b9fc7d5320543acdc9271de12e46677b9f))
- **rules:** disallow is attribute on autonomous custom elements ([ed7ec78](https://github.com/markuplint/markuplint/commit/ed7ec78c058030caacc8bd23c90c489c77c40b27))
- **rules:** enforce ARIA naming prohibition on elements without role ([f67bd5d](https://github.com/markuplint/markuplint/commit/f67bd5dcb33f28ef3daf3ecd3b5d30ad4ced7814)), closes [#3630](https://github.com/markuplint/markuplint/issues/3630)
- **rules:** implement conditional type resolution for input value ([#3598](https://github.com/markuplint/markuplint/issues/3598)) ([d478ce6](https://github.com/markuplint/markuplint/commit/d478ce669387c868dd2e4b81cad32bcccddef7f2))
- **rules:** split wai-aria into 16 granular sub-rules ([1aded91](https://github.com/markuplint/markuplint/commit/1aded912ca839a75b89d14f3ae6ba30c2701a61b)), closes [#3645](https://github.com/markuplint/markuplint/issues/3645)
- **types:** add SimpleColor, Email, and DateTime subtype validators ([1687931](https://github.com/markuplint/markuplint/commit/1687931df058d334797135a925fdf738970ac25a)), closes [#3598](https://github.com/markuplint/markuplint/issues/3598)
- **types:** add SRIHash type for integrity attribute validation ([7672999](https://github.com/markuplint/markuplint/commit/7672999a17f7d96dc286aabfcea5cc0861b73be5))
- **types:** add SRIHash type for integrity attribute validation ([ea30c84](https://github.com/markuplint/markuplint/commit/ea30c84a87025ca5d7284ce5eaad89cc3c802d92))
- **types:** add URL validation with strict checks ([3e64e86](https://github.com/markuplint/markuplint/commit/3e64e86331f92b5914a4107407f9b25233188083))
- **vscode:** add suppressed message prefix and blame parser tests ([cd80a80](https://github.com/markuplint/markuplint/commit/cd80a802c3bad29a8a1d510d2160a21a6f0a2682))
- **vscode:** add v5 handler with bulk suppression severity downgrade ([f31c0c9](https://github.com/markuplint/markuplint/commit/f31c0c93810a312aba948906f7f80e8814fc4078)), closes [#3536](https://github.com/markuplint/markuplint/issues/3536)

### BREAKING CHANGES

- The default `endOfUnquotedValueChars` no longer includes `/`.
  Unquoted attribute values preserve `/` as part of the value, matching the
  WHATWG HTML "attribute value (unquoted) state". Consumers that relied on `/`
  as a terminator must pass `endOfUnquotedValueChars: ['\t', '\n', '\f', '\r',
' ', '/', '>']` explicitly to `visitAttr()` / `attrTokenizer()`.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>

- @markuplint/spec-generator package is removed.
  Its functionality is now internal to @markuplint/html-spec.
- Prettier is no longer used. Use oxfmt instead.
- ESLint is no longer used. Use oxlint instead.
- The autoLoad option has been removed from APIOptions.
  Rules are now always auto-loaded unconditionally.
  The MLResultInfo_v1 interface has also been removed.
- The autoLoad parameter has been removed from resolveRules().
  Rules are now always auto-loaded unconditionally.
- getIndent() has been removed from the public API.
- getLine() and getCol() have been removed.
  Use getPosition() instead.
- Token.getLine() and Token.getCol() have been removed.
  Use Token.getPosition() instead.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

### Bug Fixes

- add isFatalError guard to MLEngine.exec and fix accname Deno crash ([c4b20de](https://github.com/markuplint/markuplint/commit/c4b20de128b2cfee582b3588e5004cb90065825b))
- address QA review findings for error consolidation ([ac994ee](https://github.com/markuplint/markuplint/commit/ac994ee4b4150dbcb18b30d412853df086627f87))
- **file-resolver:** handle ERR_PACKAGE_PATH_NOT_EXPORTED in generalImport ([d563d60](https://github.com/markuplint/markuplint/commit/d563d6000c4c38be54c17ea015b0f26c80c5229c)), closes [#3516](https://github.com/markuplint/markuplint/issues/3516)
- **file-resolver:** resolve package subpaths before import to avoid runtime-specific errors ([cb2b641](https://github.com/markuplint/markuplint/commit/cb2b641e25cd9de487d395b6f219dd8b60ecd306))
- fix CI failures for TS 6 compat ([8da30bf](https://github.com/markuplint/markuplint/commit/8da30bf4de34838eef895563f0e0e64006bfc8f8))
- **markuplint:** use platform-native paths in suppressions round-trip test ([df4b6a5](https://github.com/markuplint/markuplint/commit/df4b6a5f83b0fed3f74afba72cccd7bc2dbf8606))
- **ml-core:** add DOM stubs for TS 6 lib.dom.d.ts updates ([837a2ba](https://github.com/markuplint/markuplint/commit/837a2bad5afe967d4d309b91d056b46fc91c7512))
- **spec-generator:** add fetch retry, status check, and output validation ([ca047b2](https://github.com/markuplint/markuplint/commit/ca047b212dcb5acf7b5d370c9713983306d50e2d)), closes [#3456](https://github.com/markuplint/markuplint/issues/3456)
- **test-tools:** adapt matches() stub to TS 6 overloaded signature ([8338282](https://github.com/markuplint/markuplint/commit/83382824f71d2759a00592f56b74f492b743f767))

- feat(ml-core)!: resolve node references via UUID instead of object refs ([e9b6f4e](https://github.com/markuplint/markuplint/commit/e9b6f4e68bda2f60c9fa69699bf251b51874a4ac))
- feat!: adapt framework parsers to UUID-based node references ([6d543b8](https://github.com/markuplint/markuplint/commit/6d543b8c11506fe113d0ceeae3526f552f4ee26d))
- feat(ml-ast)!: replace parentNode/pairNode with UUID string references ([9d56f45](https://github.com/markuplint/markuplint/commit/9d56f4545e7e6b2378043c3c578130bb4ddd72cd))

### Features

- **astro-parser:** add component-scanner subpath export for pretenders auto scan ([3d85bc5](https://github.com/markuplint/markuplint/commit/3d85bc5f5904c0157415de175227eedf89539cda))
- **markuplint:** add experimental bulk suppressions ([bd3ab72](https://github.com/markuplint/markuplint/commit/bd3ab7204870dd6061e8e4ccbeaacd751d069a73)), closes [#3503](https://github.com/markuplint/markuplint/issues/3503)
- **markuplint:** add selector scope (LCA) to bulk suppressions ([84cf73d](https://github.com/markuplint/markuplint/commit/84cf73dd92db49f1f93ff6a5c9b71c7807ce31e9)), closes [#3509](https://github.com/markuplint/markuplint/issues/3509)
- **svelte-parser:** add component-scanner subpath export for pretenders auto scan ([fc8db17](https://github.com/markuplint/markuplint/commit/fc8db17ec40af73911d52ec9b03ca9143b115315))
- **vue-parser:** add component-scanner subpath export for pretenders auto scan ([ac8e0f5](https://github.com/markuplint/markuplint/commit/ac8e0f52be19cc0714593e26066f2f8cef9c96cd))

### BREAKING CHANGES

- MLDOM now resolves parent and pair nodes via UUID
  strings from the AST instead of direct object references.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- Parser output no longer contains parentNode/pairNode
  object references. Use parentNodeUuid/pairNodeUuid string fields instead.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

- `parentNode` and `pairNode` properties on AST nodes
  are replaced by `parentNodeUuid` and `pairNodeUuid` (UUID strings).
  The old object reference properties are removed from the parse output
  by post-processing.

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **/issue:** align template with repo issue templates and update CLAUDE.md ([6d82962](https://github.com/markuplint/markuplint/commit/6d8296203a319410c142c142f3badbfca5fc3f16))
- **file-resolver:** resolve glob results to absolute paths for Windows compatibility ([79a7844](https://github.com/markuplint/markuplint/commit/79a7844823755d886466297f960c3b21f1feec8f))
- **markuplint:** guard Error.stack access for Deno source map compat ([40508a3](https://github.com/markuplint/markuplint/commit/40508a3e25a9ed84f84f63adc95cc524628b9468))
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
- **rules:** update ARIA version default from 1.2 to 1.3 in schema.json ([f25185f](https://github.com/markuplint/markuplint/commit/f25185f124815a2a51666e8b326ba59baf2c8c93))
- **rules:** use forLegacyNode import for BCD to fix ERR_IMPORT_ATTRIBUTE_MISSING ([53f236e](https://github.com/markuplint/markuplint/commit/53f236e1e73d6dca569d7602a1d3e31e42bd0461)), closes [#3328](https://github.com/markuplint/markuplint/issues/3328)
- use visited set for cycle detection in dependencyMapper ([8821f4f](https://github.com/markuplint/markuplint/commit/8821f4fab9cb900582ae0f991e5efe7be413d584)), closes [#3336](https://github.com/markuplint/markuplint/issues/3336)

### Features

- add migrate4-5 skill for vercel-labs/skills ([297d0cf](https://github.com/markuplint/markuplint/commit/297d0cf8343f17893fa47d727e16aac262bbd714))
- **html-spec:** add experimental focusgroup and focusgroupstart global attributes ([ff406f1](https://github.com/markuplint/markuplint/commit/ff406f1be43c9669e57ea0f05de161b797fc5ecc)), closes [#3384](https://github.com/markuplint/markuplint/issues/3384)
- **ml-config,file-resolver:** wire scan field into config pipeline ([76b042a](https://github.com/markuplint/markuplint/commit/76b042a159b4037d3fff4e7c9a5c9be4d6dba44c)), closes [#3335](https://github.com/markuplint/markuplint/issues/3335) [#3336](https://github.com/markuplint/markuplint/issues/3336) [-#3341](https://github.com/-/issues/3341) [#3335](https://github.com/markuplint/markuplint/issues/3335)
- **pretenders,ml-core:** implement slots detection in JSX scanner and ml-core consumption ([ad9c8e2](https://github.com/markuplint/markuplint/commit/ad9c8e20d233cddc752fce9ad83838857f81787f)), closes [#3341](https://github.com/markuplint/markuplint/issues/3341)
- **pretenders:** add import-resolver module via es-module-lexer ([19c9f65](https://github.com/markuplint/markuplint/commit/19c9f65b3856613fa2d7bc59cc79d5b829894663)), closes [#3339](https://github.com/markuplint/markuplint/issues/3339)
- **pretenders:** add MLAST-based templateScanner for Vue/Svelte/Astro ([b710639](https://github.com/markuplint/markuplint/commit/b71063937bd13523a7fef31da2c2f9095674a957)), closes [#3338](https://github.com/markuplint/markuplint/issues/3338)
- **pretenders:** dispatch CLI input to both JSX and template scanners ([a5535af](https://github.com/markuplint/markuplint/commit/a5535af1e7e496f570cddce52148eb21f9611cfe))
- **pretenders:** import resolver phase 2 — dynamic imports, Vue Options API, barrel files ([203d4fb](https://github.com/markuplint/markuplint/commit/203d4fb5bfdc0656f95a39af23b5e079ea324d39)), closes [#3359](https://github.com/markuplint/markuplint/issues/3359)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Bug Fixes

- **cli-utils:** return empty string from unifiedDiff for identical inputs ([a738284](https://github.com/markuplint/markuplint/commit/a738284e439724da17d3444ac176ccc3d9bd2008))
- **ml-core:** treat edits within a single FixData as atomic unit ([0bb980b](https://github.com/markuplint/markuplint/commit/0bb980b7cc6fc9b89a82f3d4df58b7137a6b8766))
- **rules:** remove redundant untranslated message from non-existent-role ([6c002bb](https://github.com/markuplint/markuplint/commit/6c002bb03d44c9a5561c4a40840820e1ada31025))
- **vscode:** inline offsetToPosition to avoid unpublished @markuplint/shared export ([350bac4](https://github.com/markuplint/markuplint/commit/350bac41d9d898ac22047d324cbf4de13580e4bd))
- **website:** remove broken anchor from fixable note links ([0352cca](https://github.com/markuplint/markuplint/commit/0352ccaee06b647aca55a9ec2455335bc8e91b68))

### Features

- **cli-utils:** add specConformance to messageToString ([fda8660](https://github.com/markuplint/markuplint/commit/fda866061dbd8a989ca3c393487ea95be89b5a67))
- **i18n:** add "should/must be before" sentence translations for attr-order rule ([4a61c63](https://github.com/markuplint/markuplint/commit/4a61c63ceba21e77db77f70a263737fc0f692326))
- **markuplint:** add --fix-dry-run CLI flag and fix summary passthrough ([ecd4550](https://github.com/markuplint/markuplint/commit/ecd455042d732f950b16ca79c283bd95dc3c2a72))
- **markuplint:** add fixSummary to lint event and fixable test fixtures ([287a8be](https://github.com/markuplint/markuplint/commit/287a8be7d96e121115e357f1696314dd6b0f1a1c))
- **markuplint:** display specConformance in CLI reporters ([aaae2de](https://github.com/markuplint/markuplint/commit/aaae2de8166d6b6151f7c397ba7cd99d4a867442))
- **ml-config:** add FixToken type and JSDoc to IRuleFixer methods ([c39d3ce](https://github.com/markuplint/markuplint/commit/c39d3ceaf81ba131d4c1d0efb500d36f327081c4))
- **ml-core:** add cursor offset computation and fix summary metadata ([74b6e28](https://github.com/markuplint/markuplint/commit/74b6e28e4be2802e841697899f57f6ae04e4ffe9))
- **ml-core:** add multi-pass fix loop and cycle detection ([866b1d5](https://github.com/markuplint/markuplint/commit/866b1d54199ed1f1b5195cd0f61f3ee392b1d8a7))
- **rules:** add attr-order rule for attribute sorting ([993c0a5](https://github.com/markuplint/markuplint/commit/993c0a53823206dfa24ba699bffc27e25b11ab00))
- **rules:** add fix callbacks to 6 rules and extract shared helpers ([a3bf3c6](https://github.com/markuplint/markuplint/commit/a3bf3c69c028917548c2cc762e1562e8d99dbd9b))
- **rules:** add fixable flag to rule metadata ([10e3f26](https://github.com/markuplint/markuplint/commit/10e3f266a3431a0cae9eb402f02f00031421ac7b))
- **rules:** add head-element-order rule for head element sorting ([4f72f35](https://github.com/markuplint/markuplint/commit/4f72f350fe2fceafbb811e3538e771834fb87854))
- **rules:** support event name array for no-use-event-handler-attr ([5e854b2](https://github.com/markuplint/markuplint/commit/5e854b2198aff43b83fd5b8a8f93f840c50536ea))
- **shared:** add getPosition utility for offset-to-line/column conversion ([1cfab8b](https://github.com/markuplint/markuplint/commit/1cfab8b69614e9f9e8da87cfce5a96b2865b9a0e))
- **vscode:** add Code Action support for autofix ([2e5e04e](https://github.com/markuplint/markuplint/commit/2e5e04e6cb6fdefcd14e476d362b1ab69a83a89c))
- **vscode:** display specConformance and unify separator ([dfba104](https://github.com/markuplint/markuplint/commit/dfba1046c052a0d6c631dc174b6fadd2006c2b74))
- **website:** show fixable badge on rule list and detail pages ([8523569](https://github.com/markuplint/markuplint/commit/85235696e6fa5f8c8b91931216ba4f1b07957e8d))

### Reverts

- restore eslint config and lint globs to match dev ([d71a7a5](https://github.com/markuplint/markuplint/commit/d71a7a52d2743c5a09a07f566fd5ae157fad4a3b))

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
