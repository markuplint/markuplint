# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.7](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.6...v5.0.0-rc.7) (2026-08-31)

### Bug Fixes

- **rules:** exempt no-unclosed-element-at-eof for never-close-tag parsers ([4f426d9](https://github.com/markuplint/markuplint/commit/4f426d9dd7e29fc28b14873674069dcbd7424970)), closes [#4022](https://github.com/markuplint/markuplint/issues/4022)

# [5.0.0-rc.6](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.5...v5.0.0-rc.6) (2026-08-30)

### Bug Fixes

- add no-aria-hidden-on-hidden-until-found rule (closes [#3999](https://github.com/markuplint/markuplint/issues/3999)) ([#4017](https://github.com/markuplint/markuplint/issues/4017)) ([3dfb300](https://github.com/markuplint/markuplint/commit/3dfb3001dc66452918d5cebbb071244b68779b30))

# [5.0.0-rc.5](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.4...v5.0.0-rc.5) (2026-08-28)

### Bug Fixes

- **html-spec:** div in dl allows exactly one dt+dd group per HTML LS ([6f344bb](https://github.com/markuplint/markuplint/commit/6f344bbc72bc82dbe2d1ebf05600a5fce9838de1))
- **html-spec:** forbid aria-expanded / aria-pressed on summary in details ([#3927](https://github.com/markuplint/markuplint/issues/3927)) ([92efa50](https://github.com/markuplint/markuplint/commit/92efa500ff6033d0bb82f816cbc27090afb5dbfe))
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
- **types): strict charset=utf-8; feat(rules:** usemap-references-map ([#3969](https://github.com/markuplint/markuplint/issues/3969)) ([c63070e](https://github.com/markuplint/markuplint/commit/c63070e29ccb283da7468b2fc67db372ebfcf42a)), closes [#3945](https://github.com/markuplint/markuplint/issues/3945) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3966](https://github.com/markuplint/markuplint/issues/3966) [#3928](https://github.com/markuplint/markuplint/issues/3928)

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

- feat(rules)!: enforce ARIA naming prohibition on autonomous custom elements ([7e01a4b](https://github.com/markuplint/markuplint/commit/7e01a4b691df643255ad5b1e6542688198b01a01))
- fix(rules)!: scope invalid-attr virtual rules to narrow checks (#3803) ([77acb1d](https://github.com/markuplint/markuplint/commit/77acb1d1ac7cadd35203fa209ca016f802775b59)), closes [#3803](https://github.com/markuplint/markuplint/issues/3803)

### Features

- **config-presets:** forbid <base> after <link> or <script> in <head> ([#3925](https://github.com/markuplint/markuplint/issues/3925)) ([ceb892d](https://github.com/markuplint/markuplint/commit/ceb892d64772d459a6bd9564684218e3afbdec2e))
- **html-spec:** enforce X-UA-Compatible content="IE=edge" ([#3929](https://github.com/markuplint/markuplint/issues/3929)) ([2638fba](https://github.com/markuplint/markuplint/commit/2638fba826a489ad745ee30c4b8ed195b2362403)), closes [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3928](https://github.com/markuplint/markuplint/issues/3928) [#3734](https://github.com/markuplint/markuplint/issues/3734)
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
- **types:** enforce element-context autocomplete constraints (select webauthn, input[type=hidden] on/off) ([#3930](https://github.com/markuplint/markuplint/issues/3930)) ([dc51d46](https://github.com/markuplint/markuplint/commit/dc51d460731541c963c9aa8bdf407c20974dced4))
- **types:** reject general-enclosed matches in MediaQueryList and SourceSizeList ([#3934](https://github.com/markuplint/markuplint/issues/3934)) ([2fc8615](https://github.com/markuplint/markuplint/commit/2fc8615c475540d4e5b85661baa1491d791cb661))
- **types:** validate CSP3 grammar for meta[content][http-equiv=content-security-policy] ([#3982](https://github.com/markuplint/markuplint/issues/3982)) ([b2d1d84](https://github.com/markuplint/markuplint/commit/b2d1d84ea92c754fe2dbf54950ae8fdb74fe51eb)), closes [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3942](https://github.com/markuplint/markuplint/issues/3942) [#3946](https://github.com/markuplint/markuplint/issues/3946)

### BREAKING CHANGES

- **rules:** with no alias coverage.
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

- Named rules wrapping `invalid-attr` (e.g., `a11y/no-accesskey`)
  only perform their configured allow/disallow checks and no longer fall back to
  HTML-spec validation. To retain spec validation, extend `markuplint:html-standard`
  or set `"invalid-attr": true` in your config.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/rules

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/rules

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **rules:** allow zeroOrMore to match zero times in countPattern ([f5da340](https://github.com/markuplint/markuplint/commit/f5da340ac264c831ba0c74adfd039a1d0b6ff3fb)), closes [#3592](https://github.com/markuplint/markuplint/issues/3592)
- **rules:** apply permitted-contents user rule on pretended elements ([04c42d1](https://github.com/markuplint/markuplint/commit/04c42d165aabde754d6544486ca5d39ef4a868bc)), closes [#3739](https://github.com/markuplint/markuplint/issues/3739)
- **rules:** enforce descendantOf constraint in permitted-contents rule ([5375207](https://github.com/markuplint/markuplint/commit/5375207f169d26c65be6510f28c904d39454d08e))
- **rules:** preserve role name in permitted-roles message, dedupe with implicit-role ([3123cd6](https://github.com/markuplint/markuplint/commit/3123cd690e140e142a94c09d6948bb9cf0dfd23e)), closes [#3641](https://github.com/markuplint/markuplint/issues/3641) [#3641](https://github.com/markuplint/markuplint/issues/3641) [#3641](https://github.com/markuplint/markuplint/issues/3641)
- **types:** reject zero and negative srcset descriptors ([5584d20](https://github.com/markuplint/markuplint/commit/5584d2089fe1dfe508d43601fa14aeff4e08b265))

### Features

- **ml-spec:** add ConditionalAttributeType to Attribute.type union ([#3685](https://github.com/markuplint/markuplint/issues/3685)) ([a619a07](https://github.com/markuplint/markuplint/commit/a619a071d93566dd8aa7ab8dee2ed751c2e8756c)), closes [#3598](https://github.com/markuplint/markuplint/issues/3598) [#3189](https://github.com/markuplint/markuplint/issues/3189)
- **rules:** add #nonEmptyText matching to permitted-contents engine ([4b91cf3](https://github.com/markuplint/markuplint/commit/4b91cf37cb8d54b86e8bfe125276251f2d8cb97b))
- **rules:** add document uniqueness rules (autofocus, visible-main, charset) ([1befb20](https://github.com/markuplint/markuplint/commit/1befb2051015df7669fbd07da3fea3a0b6542a90))
- **rules:** check forbiddenAncestors in permitted-contents rule ([0633c05](https://github.com/markuplint/markuplint/commit/0633c05df91a2f51361a72efe8ebb2e604a53918))
- **rules:** check uniqueAttrs constraint in permitted-contents rule ([6b2cf6b](https://github.com/markuplint/markuplint/commit/6b2cf6b9fc7d5320543acdc9271de12e46677b9f))
- **rules:** disallow is attribute on autonomous custom elements ([ed7ec78](https://github.com/markuplint/markuplint/commit/ed7ec78c058030caacc8bd23c90c489c77c40b27))
- **rules:** enforce ARIA naming prohibition on elements without role ([f67bd5d](https://github.com/markuplint/markuplint/commit/f67bd5dcb33f28ef3daf3ecd3b5d30ad4ced7814)), closes [#3630](https://github.com/markuplint/markuplint/issues/3630)
- **rules:** implement conditional type resolution for input value ([#3598](https://github.com/markuplint/markuplint/issues/3598)) ([d478ce6](https://github.com/markuplint/markuplint/commit/d478ce669387c868dd2e4b81cad32bcccddef7f2))
- **rules:** split wai-aria into 16 granular sub-rules ([1aded91](https://github.com/markuplint/markuplint/commit/1aded912ca839a75b89d14f3ae6ba30c2701a61b)), closes [#3645](https://github.com/markuplint/markuplint/issues/3645)

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/rules

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **rules:** update ARIA version default from 1.2 to 1.3 in schema.json ([f25185f](https://github.com/markuplint/markuplint/commit/f25185f124815a2a51666e8b326ba59baf2c8c93))
- **rules:** use forLegacyNode import for BCD to fix ERR_IMPORT_ATTRIBUTE_MISSING ([53f236e](https://github.com/markuplint/markuplint/commit/53f236e1e73d6dca569d7602a1d3e31e42bd0461)), closes [#3328](https://github.com/markuplint/markuplint/issues/3328)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Bug Fixes

- **rules:** remove redundant untranslated message from non-existent-role ([6c002bb](https://github.com/markuplint/markuplint/commit/6c002bb03d44c9a5561c4a40840820e1ada31025))

### Features

- **rules:** add attr-order rule for attribute sorting ([993c0a5](https://github.com/markuplint/markuplint/commit/993c0a53823206dfa24ba699bffc27e25b11ab00))
- **rules:** add fix callbacks to 6 rules and extract shared helpers ([a3bf3c6](https://github.com/markuplint/markuplint/commit/a3bf3c69c028917548c2cc762e1562e8d99dbd9b))
- **rules:** add fixable flag to rule metadata ([10e3f26](https://github.com/markuplint/markuplint/commit/10e3f266a3431a0cae9eb402f02f00031421ac7b))
- **rules:** add head-element-order rule for head element sorting ([4f72f35](https://github.com/markuplint/markuplint/commit/4f72f350fe2fceafbb811e3538e771834fb87854))
- **rules:** support event name array for no-use-event-handler-attr ([5e854b2](https://github.com/markuplint/markuplint/commit/5e854b2198aff43b83fd5b8a8f93f840c50536ea))

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **rules:** add inline fix callbacks to three rules ([16f9600](https://github.com/markuplint/markuplint/commit/16f9600a1f495046541c195859e218ca6dd61eca))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

- fix(rules)!: remove complementary from top-level landmark check ([4643651](https://github.com/markuplint/markuplint/commit/4643651d256276ae0473d4756e72277d59398e3d))

### BREAKING CHANGES

- The landmark-roles rule no longer checks that
  complementary landmarks are top-level. This aligns with axe-core's
  deprecation of landmark-complementary-is-top-level.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **rules:** address review feedback for require-dialog-autofocus ([6fcadb2](https://github.com/markuplint/markuplint/commit/6fcadb2ab0e6a974e8ba6f644eff914a7840b8ef))
- treat orphaned end tags as bogus instead of plain text ([#1575](https://github.com/markuplint/markuplint/issues/1575)) ([557199a](https://github.com/markuplint/markuplint/commit/557199a6960ab35573a544f9a33c00e98eb9967e))

- feat(rules)!: simplify invalid-attr options and remove attrs ([3ced12d](https://github.com/markuplint/markuplint/commit/3ced12d200f12ba4c9e177c9aaca25e7e24a9151))
- feat(rules)!: add no-unsupported-features rule for browser support checks ([8525a96](https://github.com/markuplint/markuplint/commit/8525a96fb04f634820362a9a73d6541284b53686))
- feat(rules)!: change ignoreOmittedElements default to true ([5ec04a7](https://github.com/markuplint/markuplint/commit/5ec04a7d63cbf19846b42124c22653197f603a59)), closes [#3136](https://github.com/markuplint/markuplint/issues/3136)
- refactor(rules)!: replace selfClosingSolidus with tagCloseChar ([f9cd9d8](https://github.com/markuplint/markuplint/commit/f9cd9d81bfb0ba49c2578eace7b04a9a1ebdd12a))

### Features

- **html-spec:** require href or imagesrcset on link element ([e6a2631](https://github.com/markuplint/markuplint/commit/e6a26318ed8e4be9ba4e81884eb0b879a816efb5)), closes [#717](https://github.com/markuplint/markuplint/issues/717)
- **ml-spec,rules:** adopt ARIA 1.3 property names with 1.2 compat ([4f7e54d](https://github.com/markuplint/markuplint/commit/4f7e54d21593495d36e48fbe8ad27f8be85ab5ef))
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

### Performance Improvements

- **rules:** fix exponential slowdown in transparent element resolution ([f657e6a](https://github.com/markuplint/markuplint/commit/f657e6a0156933c3acafb8e3975fbc31488b7cca)), closes [#3249](https://github.com/markuplint/markuplint/issues/3249)

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
- The `ignoreOmittedElements` option in the
  `required-element` rule now defaults to `true` instead of `false`.
  Ghost (omitted) elements implicitly created by the HTML parser
  are no longer counted as satisfying the requirement by default.
  Users who relied on the previous behavior should explicitly set
  `ignoreOmittedElements: false`.
- The end-tag rule now checks tagCloseChar for
  self-closing detection instead of the removed selfClosingSolidus
  property.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [4.12.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.11.2...@markuplint/rules@4.12.0) (2026-02-10)

### Features

- **rules:** add ignoreOmittedElements option to required-element ([0cc879c](https://github.com/markuplint/markuplint/commit/0cc879ca175491da7eda4d6f4d0638b74fe528e5)), closes [#2066](https://github.com/markuplint/markuplint/issues/2066)
- **rules:** support Invoker Commands API in neighbor-popovers rule ([963853f](https://github.com/markuplint/markuplint/commit/963853f9f3701ab552d7d03fe5712a671c50d444)), closes [#3065](https://github.com/markuplint/markuplint/issues/3065)

## [4.11.2](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.11.1...@markuplint/rules@4.11.2) (2025-11-05)

**Note:** Version bump only for package @markuplint/rules

## [4.11.1](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.11.0...@markuplint/rules@4.11.1) (2025-08-24)

### Bug Fixes

- **rules:** handle rowspan/colspan combinations correctly in table-row-column-alignment ([5579c98](https://github.com/markuplint/markuplint/commit/5579c98995fbad02086e2c9a5470cfcee5ef9ef0))

# [4.11.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.12...@markuplint/rules@4.11.0) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

### Features

- **rules:** improve error message for multiple required attributes ([4aa4e4f](https://github.com/markuplint/markuplint/commit/4aa4e4fe54efc05edf7e9166a7fd769127b75769))

## [4.10.12](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.11...@markuplint/rules@4.10.12) (2025-04-13)

**Note:** Version bump only for package @markuplint/rules

## [4.10.11](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.10...@markuplint/rules@4.10.11) (2025-03-09)

**Note:** Version bump only for package @markuplint/rules

## [4.10.10](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.9...@markuplint/rules@4.10.10) (2025-02-27)

### Bug Fixes

- **html-spec:** fix required attrs and conditional attrs of the `picture` element ([60f9089](https://github.com/markuplint/markuplint/commit/60f908979238d98950a7141cf74b6925f829283e))

## [4.10.9](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.8...@markuplint/rules@4.10.9) (2025-02-11)

**Note:** Version bump only for package @markuplint/rules

## [4.10.8](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.7...@markuplint/rules@4.10.8) (2025-02-04)

### Bug Fixes

- **rules:** fix verifing pretendered label element ([9b3266a](https://github.com/markuplint/markuplint/commit/9b3266a4f08ca725586672054f1353b1c663babc)), closes [#2392](https://github.com/markuplint/markuplint/issues/2392)

## [4.10.7](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.6...@markuplint/rules@4.10.7) (2024-12-04)

**Note:** Version bump only for package @markuplint/rules

## [4.10.6](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.5...@markuplint/rules@4.10.6) (2024-11-17)

### Bug Fixes

- **rules:** change to spread syntax ([6f2688b](https://github.com/markuplint/markuplint/commit/6f2688bfd4a7f10d63f653d90bbb19463c1066fb))

## [4.10.5](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.4...@markuplint/rules@4.10.5) (2024-10-31)

**Note:** Version bump only for package @markuplint/rules

## [4.10.4](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.3...@markuplint/rules@4.10.4) (2024-10-28)

**Note:** Version bump only for package @markuplint/rules

## [4.10.3](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.2...@markuplint/rules@4.10.3) (2024-10-27)

**Note:** Version bump only for package @markuplint/rules

## [4.10.2](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.1...@markuplint/rules@4.10.2) (2024-10-15)

**Note:** Version bump only for package @markuplint/rules

## [4.10.1](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.10.0...@markuplint/rules@4.10.1) (2024-10-14)

**Note:** Version bump only for package @markuplint/rules

# [4.10.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.9.4...@markuplint/rules@4.10.0) (2024-09-23)

### Bug Fixes

- **rules:** excluded cases where the element is palpable from the `no-empty-palpable-content` rule ([6071c51](https://github.com/markuplint/markuplint/commit/6071c5133b7c5d52d8e052ac9f39fb5b10c38b8e))
- **rules:** fix the message of the `heading-levels` rule and add to translate in Japanese ([ec57e1e](https://github.com/markuplint/markuplint/commit/ec57e1e5ff4549ee5574928ad20fd461d87974a5))

### Features

- **types:** avoid parsing and simply accept any value when the CSS includes `var()` ([5817693](https://github.com/markuplint/markuplint/commit/5817693cfcd1a253c627db323505e4b515f69395))

## [4.9.4](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.9.3...@markuplint/rules@4.9.4) (2024-09-02)

**Note:** Version bump only for package @markuplint/rules

## [4.9.3](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.9.2...@markuplint/rules@4.9.3) (2024-06-25)

### Bug Fixes

- **ml-core:** `localName` returns lowercase when using case-sensitive parser for tag names ([b1acadd](https://github.com/markuplint/markuplint/commit/b1acaddfd6bf939ee809f6419ce85a701033ca4f))

## [4.9.2](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.9.1...@markuplint/rules@4.9.2) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

## [4.9.1](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.9.0...@markuplint/rules@4.9.1) (2024-05-28)

**Note:** Version bump only for package @markuplint/rules

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.8.0...@markuplint/rules@4.9.0) (2024-05-12)

### Features

- **rules:** support directive type ([2303ca7](https://github.com/markuplint/markuplint/commit/2303ca7118d1c25b336e5fca6ebb2380b63b4b2f))

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.8.0-alpha.0...@markuplint/rules@4.8.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/rules

# [4.8.0-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/rules@4.7.0...@markuplint/rules@4.8.0-alpha.0) (2024-05-04)

### Features

- **rules:** add `no-ambiguous-navigable-target-names` rule ([742db4e](https://github.com/markuplint/markuplint/commit/742db4eb98b8f27e8a1f6a82d3b6541871e02a5c))
- **rules:** add `table-row-column-alignment` rule ([4b071f8](https://github.com/markuplint/markuplint/commit/4b071f8d7dae0f1500e1a77046b289489eb5a598))
- **rules:** apply `no-ambiguous-navigable-target-names` to build-in rules ([93d34f0](https://github.com/markuplint/markuplint/commit/93d34f0ead2624107a5b6f315af0c8bbd4f1e1ec))
- **rules:** apply `table-row-column-alignment` to build-in rules ([85de609](https://github.com/markuplint/markuplint/commit/85de6098813cd7c3167099f9e7e6250ca8324539))
