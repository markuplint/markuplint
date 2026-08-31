# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.7](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.6...v5.0.0-rc.7) (2026-08-31)

### Bug Fixes

- **ml-core:** fix named rule group disable propagation and validation ([139f466](https://github.com/markuplint/markuplint/commit/139f4661a12ac10b15ade305c30bbd8234b07b0f))

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

- **ml-core:** look up dedupe contract under both alias and base rule names ([a5dde7e](https://github.com/markuplint/markuplint/commit/a5dde7e23a12a43d976fbfaa1cc3dec67265447e)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844) [#3871](https://github.com/markuplint/markuplint/issues/3871)
- **ml-core:** re-verify fixed code and detect N-pass fix cycles ([8c96516](https://github.com/markuplint/markuplint/commit/8c96516d8057acdcf06dc279c2183390f0966e98)), closes [#3890](https://github.com/markuplint/markuplint/issues/3890) [#3891](https://github.com/markuplint/markuplint/issues/3891)
- **ml-core:** stop accumulating duplicate mapping errors across setCode ([2874d5b](https://github.com/markuplint/markuplint/commit/2874d5b60b24ccc501f7dae1f6ab25fb6e51e58b)), closes [#3900](https://github.com/markuplint/markuplint/issues/3900)
- **pretenders:** resolve same-named components via imports, not scan order ([#3957](https://github.com/markuplint/markuplint/issues/3957)) ([d46a514](https://github.com/markuplint/markuplint/commit/d46a5148c4d7afb156962f4ed795f40a9324e6c5)), closes [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951) [#3951](https://github.com/markuplint/markuplint/issues/3951)
- **rules:** surface disallowed-element reason via reasonOnly (close [#3815](https://github.com/markuplint/markuplint/issues/3815)) ([#3986](https://github.com/markuplint/markuplint/issues/3986)) ([0142cec](https://github.com/markuplint/markuplint/commit/0142cec667f70fee086f2a6e06d7a26e66bda380))

### Code Refactoring

- **rules:** redesign v5 rule system — naming, splits, specConformance ([#3989](https://github.com/markuplint/markuplint/issues/3989)) ([e925565](https://github.com/markuplint/markuplint/commit/e925565ce537848d7d1573369723cbce724a841b)), closes [#4](https://github.com/markuplint/markuplint/issues/4) [#aside-conditional-role-mapping-aria-13](https://github.com/markuplint/markuplint/issues/aside-conditional-role-mapping-aria-13)

- fix(ml-core)!: reject pretender on standard HTML elements ([0576425](https://github.com/markuplint/markuplint/commit/0576425baf9b78141523bcd0e4a102062b96bc81)), closes [#3740](https://github.com/markuplint/markuplint/issues/3740)

### Features

- **ml-core:** hook-based dedupe for parse-error channel via mirrorsParseErrorCodes ([6a36f17](https://github.com/markuplint/markuplint/commit/6a36f17d292a2400494a3670c93cb2f02999b48b)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)
- **ml-core:** surface non-fatal parser errors via opt-in parse-error channel ([d715fbe](https://github.com/markuplint/markuplint/commit/d715fbe586c478b98472a570b3175873cf244aef)), closes [#3844](https://github.com/markuplint/markuplint/issues/3844)

### BREAKING CHANGES

- **rules:** with no alias coverage.
- `pretenders` config entries whose selector matches a
  standard HTML element are now ignored. Configurations that previously
  relied on `<marquee as="div">` to suppress markuplint violations must
  remove the entry; the original element is now linted on its own merits.

# [5.0.0-rc.4](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.3...v5.0.0-rc.4) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-core

# [5.0.0-rc.3](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.2...v5.0.0-rc.3) (2026-04-19)

**Note:** Version bump only for package @markuplint/ml-core

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **ml-core:** propagate base rule disable to virtual rules in nodeRules/childNodeRules ([06fa269](https://github.com/markuplint/markuplint/commit/06fa2695d43671adc1ebcadf1304aca44fd10919)), closes [#3578](https://github.com/markuplint/markuplint/issues/3578)

- build!: remove ESLint and replace with oxlint ([1e0a337](https://github.com/markuplint/markuplint/commit/1e0a337707f76b903b16beeeb8c4d4fc0d8fc9e4))
- feat(ml-core)!: remove deprecated getIndent function ([7ab1a2d](https://github.com/markuplint/markuplint/commit/7ab1a2dae8f36002f4e5f3108a400bb9095db319))

### Features

- **ml-core:** propagate option overrides to virtual rules in nodeRules/childNodeRules ([9cb9521](https://github.com/markuplint/markuplint/commit/9cb9521fc1303c132f547ffd1e8c82b3b9099bef))

### BREAKING CHANGES

- ESLint is no longer used. Use oxlint instead.
- getIndent() has been removed from the public API.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

### Bug Fixes

- add isFatalError guard to MLEngine.exec and fix accname Deno crash ([c4b20de](https://github.com/markuplint/markuplint/commit/c4b20de128b2cfee582b3588e5004cb90065825b))
- **ml-core:** add DOM stubs for TS 6 lib.dom.d.ts updates ([837a2ba](https://github.com/markuplint/markuplint/commit/837a2bad5afe967d4d309b91d056b46fc91c7512))

- feat(ml-core)!: resolve node references via UUID instead of object refs ([e9b6f4e](https://github.com/markuplint/markuplint/commit/e9b6f4e68bda2f60c9fa69699bf251b51874a4ac))

### BREAKING CHANGES

- MLDOM now resolves parent and pair nodes via UUID
  strings from the AST instead of direct object references.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Bug Fixes

- **pretenders:** fix false positives in children detection and harden tests ([96f7af3](https://github.com/markuplint/markuplint/commit/96f7af3adf4d6a3b8c65a9e9464cf1bf34c48613))

### Features

- **pretenders,ml-core:** implement slots detection in JSX scanner and ml-core consumption ([ad9c8e2](https://github.com/markuplint/markuplint/commit/ad9c8e20d233cddc752fce9ad83838857f81787f)), closes [#3341](https://github.com/markuplint/markuplint/issues/3341)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

### Bug Fixes

- **ml-core:** treat edits within a single FixData as atomic unit ([0bb980b](https://github.com/markuplint/markuplint/commit/0bb980b7cc6fc9b89a82f3d4df58b7137a6b8766))

### Features

- **ml-core:** add cursor offset computation and fix summary metadata ([74b6e28](https://github.com/markuplint/markuplint/commit/74b6e28e4be2802e841697899f57f6ae04e4ffe9))
- **ml-core:** add multi-pass fix loop and cycle detection ([866b1d5](https://github.com/markuplint/markuplint/commit/866b1d54199ed1f1b5195cd0f61f3ee392b1d8a7))

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **ml-core:** implement autofix engine with fix-applier and rule-fixer ([36efcec](https://github.com/markuplint/markuplint/commit/36efcecb17e2f4e0729390b1684e571c13c38a38))

### BREAKING CHANGES

- **ml-core:** verify() now returns VerifyResult instead of
  Violation[]. RuleSeed.fix() is removed in favor of inline fix
  callbacks on report().

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

**Note:** Version bump only for package @markuplint/ml-core

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **ml-core:** improve detection of namespace ([5b507ad](https://github.com/markuplint/markuplint/commit/5b507ad7c19c5015b8ce587845d901e31dfa6518))
- treat orphaned end tags as bogus instead of plain text ([#1575](https://github.com/markuplint/markuplint/issues/1575)) ([557199a](https://github.com/markuplint/markuplint/commit/557199a6960ab35573a544f9a33c00e98eb9967e))
- use explicit `export type` for type-only re-exports ([7c77c05](https://github.com/markuplint/markuplint/commit/7c77c05619518c8d18a183132040f5b2cd0ab6ec))

- feat(ml-core)!: adapt DOM layer to simplified AST types ([5d92f2b](https://github.com/markuplint/markuplint/commit/5d92f2be75ce0d45823fb26f72588aecee278ba3))

### Features

- delete htmx-parser, simplify alpine-parser, add migration guide and tests ([f8dbb09](https://github.com/markuplint/markuplint/commit/f8dbb090707d8cfbf3d859a9b868b2087064f89b))
- **ml-core:** add directive and IDL resolution to MLAttr constructor ([ba0ad66](https://github.com/markuplint/markuplint/commit/ba0ad66585c022cdb34fda8a8191bcc9af078e07))
- **ml-core:** add expandNamedRules for named rule groups in rules section ([7eed355](https://github.com/markuplint/markuplint/commit/7eed355075cee90b17a79c0f8a5b18213d1ce54e))
- **ml-core:** implement VirtualRule system for named nodeRules ([864f51d](https://github.com/markuplint/markuplint/commit/864f51d54dba26c6af2bc45eea3566db5f7d8e26))
- **ml-core:** require defaultValue for non-boolean rule types in createRule ([6c99908](https://github.com/markuplint/markuplint/commit/6c999087feff4fb8906cf47d564ee08ca8e5f450)), closes [#808](https://github.com/markuplint/markuplint/issues/808)
- **ml-core:** the each block skips linting in childNodes ([d5ca83d](https://github.com/markuplint/markuplint/commit/d5ca83d5ec6dc9b2f40b5d6599b07cc4746f3dca))
- **ml-core:** wire ruleCommonSettings through MLCore to Document ([28bb176](https://github.com/markuplint/markuplint/commit/28bb17601b983b3789b2ae200bd77ad887905cda))
- **ml-spec:** add declarative directivePatterns for parser-less framework support ([ceb9aa6](https://github.com/markuplint/markuplint/commit/ceb9aa67048e3a058b40a9e4d91eb903c8ff1861))

### Performance Improvements

- **ml-core:** add memoization cache to MLElement.getAccessibleName() ([cdbe289](https://github.com/markuplint/markuplint/commit/cdbe289755312ee30e3f02171f42bf2c00412eea)), closes [#2179](https://github.com/markuplint/markuplint/issues/2179)

### BREAKING CHANGES

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

## [4.13.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.2...@markuplint/ml-core@4.13.3) (2026-02-10)

**Note:** Version bump only for package @markuplint/ml-core

## [4.13.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.1...@markuplint/ml-core@4.13.2) (2025-11-05)

**Note:** Version bump only for package @markuplint/ml-core

## [4.13.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.13.0...@markuplint/ml-core@4.13.1) (2025-08-24)

**Note:** Version bump only for package @markuplint/ml-core

# [4.13.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.4...@markuplint/ml-core@4.13.0) (2025-08-13)

### Bug Fixes

- ensure that each `clean` command correctly removes build files ([110b78e](https://github.com/markuplint/markuplint/commit/110b78e85379d29a84ca68325127344a87a570b6))

### Features

- **markuplint:** add maxViolations support to API layer ([cb6d577](https://github.com/markuplint/markuplint/commit/cb6d577483a38e32a378d89a13e950c0eb311b09))
- **markuplint:** add status field to MLResultInfo and simplify verification ([56deb99](https://github.com/markuplint/markuplint/commit/56deb999a330bb7d91333dc464a034cbc6010479))
- **ml-core:** add new DOM API properties from TypeScript 5.9.2 ([a6cfed3](https://github.com/markuplint/markuplint/commit/a6cfed32c3abf6874161aad9c4f5c47541320b7b))
- **ml-core:** add validation for rule existence ([4c7ee75](https://github.com/markuplint/markuplint/commit/4c7ee758bd98737e8df7b0aa247306e61e48d30a))
- **ml-core:** add ViolationCollector for performance optimization ([a4e9694](https://github.com/markuplint/markuplint/commit/a4e9694a87f3e0958a59974ad6d03775831ec399))
- **ml-core:** enhance ViolationCollector for max-count functionality ([92316a4](https://github.com/markuplint/markuplint/commit/92316a4b070a1d53ae12cf1ae8cfdf3444e02025))
- **ml-core:** implement consistent textContent property across DOM nodes ([6c0fb62](https://github.com/markuplint/markuplint/commit/6c0fb62ded45f779f30602bf11299e928bdf24aa))

## [4.12.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.3...@markuplint/ml-core@4.12.4) (2025-04-13)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.2...@markuplint/ml-core@4.12.3) (2025-03-09)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.1...@markuplint/ml-core@4.12.2) (2025-02-27)

**Note:** Version bump only for package @markuplint/ml-core

## [4.12.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.12.0...@markuplint/ml-core@4.12.1) (2025-02-11)

**Note:** Version bump only for package @markuplint/ml-core

# [4.12.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.11.0...@markuplint/ml-core@4.12.0) (2025-02-04)

### Bug Fixes

- **ml-core:** fix to match pretended element type selectors ([3f6d139](https://github.com/markuplint/markuplint/commit/3f6d1395ca6aab3698bfde771e8ba7086acb83c7))

### Features

- **ml-core:** add `matchMLSelector` method to Element ([cd822d6](https://github.com/markuplint/markuplint/commit/cd822d6f3f7b899ffbc03646337cb018d72ce5e7))

# [4.11.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.5...@markuplint/ml-core@4.11.0) (2024-12-04)

### Features

- **ml-core:** add `caretPositionFromPoint` prop to MLDocument ([8f7e822](https://github.com/markuplint/markuplint/commit/8f7e822d29f6ec287b9470eae0f4630cc2627eb7))
- **ml-core:** add `currentCSSZoom` prop to MLElement ([8b12e07](https://github.com/markuplint/markuplint/commit/8b12e07481ee1bbe2d54c9b4179e06ed01250662))
- **ml-core:** add `fragmentDirective` prop to MLDocument ([a62b6b1](https://github.com/markuplint/markuplint/commit/a62b6b10612601fd49bcd35f23723f0466d1b988))
- **ml-core:** add `writingSuggestions` prop to MLElement ([59c1d66](https://github.com/markuplint/markuplint/commit/59c1d6682cff93a17d0da8da3cd3c4dd1c63482b))

## [4.10.5](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.4...@markuplint/ml-core@4.10.5) (2024-11-17)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.4](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.3...@markuplint/ml-core@4.10.4) (2024-10-31)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.2...@markuplint/ml-core@4.10.3) (2024-10-28)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.1...@markuplint/ml-core@4.10.2) (2024-10-27)

**Note:** Version bump only for package @markuplint/ml-core

## [4.10.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.10.0...@markuplint/ml-core@4.10.1) (2024-10-15)

**Note:** Version bump only for package @markuplint/ml-core

# [4.10.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.9.0...@markuplint/ml-core@4.10.0) (2024-10-14)

### Features

- **ml-core:** enabled control over parse-error output using `severity.parseError` ([7ef6d6a](https://github.com/markuplint/markuplint/commit/7ef6d6ad58845c81367d5a2944c254a12eeaa17e))

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.3...@markuplint/ml-core@4.9.0) (2024-09-23)

### Features

- **ml-core:** update DOM API according to TypeScript DOM Libs ([b95b689](https://github.com/markuplint/markuplint/commit/b95b689a84f0a176175943edf5d4163de8b1522f))

## [4.8.3](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.2...@markuplint/ml-core@4.8.3) (2024-09-02)

**Note:** Version bump only for package @markuplint/ml-core

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.1...@markuplint/ml-core@4.8.2) (2024-06-25)

### Bug Fixes

- **ml-core:** `localName` returns lowercase when using case-sensitive parser for tag names ([b1acadd](https://github.com/markuplint/markuplint/commit/b1acaddfd6bf939ee809f6419ce85a701033ca4f))
- **ml-core:** selector matches both pretender's name and original name ([c683711](https://github.com/markuplint/markuplint/commit/c6837114638e07b22e8b35a4f6944e400222e69e))

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.8.0...@markuplint/ml-core@4.8.1) (2024-06-09)

### Bug Fixes

- fix to export type files ([eff4bbf](https://github.com/markuplint/markuplint/commit/eff4bbfd127574809dc5e15d7cafe87699758ee0))

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.2...@markuplint/ml-core@4.8.0) (2024-05-28)

### Features

- **ml-core:** change `childNodes` to no longer return fragment nodes ([bc41f13](https://github.com/markuplint/markuplint/commit/bc41f13c15ee61616ab9673ed81df52d19786c31))
- **ml-core:** separate getter `childNodes` and method `getPureChildNodes()` ([a98d22c](https://github.com/markuplint/markuplint/commit/a98d22c5bd291158ceae21c52580136e49bb938b))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.1...@markuplint/ml-core@4.7.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/ml-core

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.1-alpha.0...@markuplint/ml-core@4.7.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-core

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/ml-core@4.7.0...@markuplint/ml-core@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/ml-core
