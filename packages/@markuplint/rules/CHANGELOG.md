# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
