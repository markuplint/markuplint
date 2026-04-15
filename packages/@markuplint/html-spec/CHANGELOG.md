# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.0.0-rc.2](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.1...v5.0.0-rc.2) (2026-04-15)

### Bug Fixes

- **html-spec:** add dir as required attribute for bdo element ([81a6c1f](https://github.com/markuplint/markuplint/commit/81a6c1f40630b3b9a904d380aed47042dfb90972))
- **html-spec:** change dl content model from oneOrMore to zeroOrMore groups ([e29f6e4](https://github.com/markuplint/markuplint/commit/e29f6e4beb6cee1143d2aa4f53b770d97624dd0a)), closes [#3592](https://github.com/markuplint/markuplint/issues/3592)
- **html-spec:** change optgroup label type from Any to NoEmptyAny ([c6b0e88](https://github.com/markuplint/markuplint/commit/c6b0e887cbb7576e9139a269c98b8718bcaffb18))
- **html-spec:** correct permittedRoles for input[type=button/image/reset/submit] ([054e8e2](https://github.com/markuplint/markuplint/commit/054e8e2b1ca9c1b85fa5a0bcd18f72a22669f4a5)), closes [#3588](https://github.com/markuplint/markuplint/issues/3588)
- **html-spec:** override MDN incorrect experimental flag on audio loading attribute ([09d5898](https://github.com/markuplint/markuplint/commit/09d5898256ef0880bcdce9d8a514fbcae6b4d226))
- **html-spec:** override MDN incorrect experimental flag on video loading attribute ([52def75](https://github.com/markuplint/markuplint/commit/52def759157d046cacc0660422db188e4d8da753)), closes [#3697](https://github.com/markuplint/markuplint/issues/3697)
- **html-spec:** remove global attr overrides that drop type definitions ([6ff2f0d](https://github.com/markuplint/markuplint/commit/6ff2f0d2ac8c0410b90af5e9ccb6be126ec96c39))
- **html-spec:** restore ARIA 1.3 role name extraction ([01b9ce3](https://github.com/markuplint/markuplint/commit/01b9ce350b472e9f37f04238be446c3898e317a8))

- refactor(html-spec)!: migrate spec-generator into html-spec and run via native TypeScript ([8f928cc](https://github.com/markuplint/markuplint/commit/8f928ccf17a959447f477eb4c3d0db13ab2ba730))

### Features

- **html-spec:** add conditional attribute constraints for script element ([9abbf95](https://github.com/markuplint/markuplint/commit/9abbf95c43d8bcedbfa19d0c09223a322967bc3b))
- **html-spec:** add conditional value types for input element ([#3598](https://github.com/markuplint/markuplint/issues/3598)) ([290be1c](https://github.com/markuplint/markuplint/commit/290be1cde53165f1f6165731bf2ec184b0c46b54))
- **html-spec:** add forbiddenAncestors for main, header, footer, address ([e51b745](https://github.com/markuplint/markuplint/commit/e51b745c0fd7662946b267b67f94b1bfbf95b89c))
- **html-spec:** add loading attribute type for audio and video elements ([12a03f7](https://github.com/markuplint/markuplint/commit/12a03f7252bfb8bae2bd427dbb9a553e2038ecb3)), closes [#3542](https://github.com/markuplint/markuplint/issues/3542)
- **html-spec:** add speculationrules to script type attribute enum ([3568ee6](https://github.com/markuplint/markuplint/commit/3568ee6012b3f30e3f913f346e000519939c1448))
- **html-spec:** add touch event handler attributes (ontouchstart, etc.) ([9be2b57](https://github.com/markuplint/markuplint/commit/9be2b57ea39ec33c7d3f24bca530a40b6e4d7708))
- **html-spec:** add uniqueAttrs for track default attribute ([ccafb65](https://github.com/markuplint/markuplint/commit/ccafb65fbda86e42f509566eb95798cfac271c11))
- **html-spec:** split link[as] enum by rel condition ([#3189](https://github.com/markuplint/markuplint/issues/3189)) ([6aa1fe8](https://github.com/markuplint/markuplint/commit/6aa1fe896223a3b7437e38a3c2b5092edefcd240))
- **html-spec:** use #nonEmptyText for title and option elements ([ede5d4c](https://github.com/markuplint/markuplint/commit/ede5d4c87c72b7e2e95f17799f3632eb9108feef))
- **types:** add SRIHash type for integrity attribute validation ([7672999](https://github.com/markuplint/markuplint/commit/7672999a17f7d96dc286aabfcea5cc0861b73be5))

### BREAKING CHANGES

- @markuplint/spec-generator package is removed.
  Its functionality is now internal to @markuplint/html-spec.

# [5.0.0-rc.1](https://github.com/markuplint/markuplint/compare/v5.0.0-rc.0...v5.0.0-rc.1) (2026-03-27)

**Note:** Version bump only for package @markuplint/html-spec

# [5.0.0-rc.0](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.3...v5.0.0-rc.0) (2026-03-12)

### Features

- **html-spec:** add experimental focusgroup and focusgroupstart global attributes ([ff406f1](https://github.com/markuplint/markuplint/commit/ff406f1be43c9669e57ea0f05de161b797fc5ecc)), closes [#3384](https://github.com/markuplint/markuplint/issues/3384)

# [5.0.0-alpha.3](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.2...v5.0.0-alpha.3) (2026-02-26)

**Note:** Version bump only for package @markuplint/html-spec

# [5.0.0-alpha.2](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2026-02-23)

### Features

- **html-spec:** add 32 MathML element specifications ([2acf2e1](https://github.com/markuplint/markuplint/commit/2acf2e1f1c6f536a6de424a6b7eb6c9b9ca2c178))

# [5.0.0-alpha.1](https://github.com/markuplint/markuplint/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2026-02-22)

### Features

- **html-spec:** add conditional aside role mapping for ARIA 1.3 ([f3315b7](https://github.com/markuplint/markuplint/commit/f3315b7352d17308c8d6edfc0831da3cb33a0922))

# [5.0.0-alpha.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v5.0.0-alpha.0) (2026-02-20)

### Bug Fixes

- **html-spec:** add aria-valuenow restrictions and missing alt fields ([b5af2b5](https://github.com/markuplint/markuplint/commit/b5af2b57238e40c4bf807fb968b4309871709046)), closes [#3214](https://github.com/markuplint/markuplint/issues/3214) [#2465](https://github.com/markuplint/markuplint/issues/2465)
- **html-spec:** add missing dpub-aria source URL to generated spec data ([0797e83](https://github.com/markuplint/markuplint/commit/0797e832a4b1c6ce80b1dc32529228db5a3e07cb))
- **html-spec:** fix optgroup selector and remove stale comment ([f6bcd7f](https://github.com/markuplint/markuplint/commit/f6bcd7f7036516e236117c34349085986efacfc3))
- **html-spec:** mark input switch attribute as non-standard ([5b28f44](https://github.com/markuplint/markuplint/commit/5b28f447b31f38420b8e0cc91827f66e0fe4331d))
- **html-spec:** update ARIA role descriptions for combobox, tab, and tabpanel ([4b8e5cc](https://github.com/markuplint/markuplint/commit/4b8e5cc69c9e2bd1c83b8dbf0a991324263a7156))
- **html-spec:** update as attribute enum values based on WHATWG spec changes ([f10bd77](https://github.com/markuplint/markuplint/commit/f10bd77e647d37b41a0ee99b1adfe4fd0cb42831)), closes [whatwg/html#10212](https://github.com/whatwg/html/issues/10212) [whatwg/html#11981](https://github.com/whatwg/html/issues/11981) [#1987](https://github.com/markuplint/markuplint/issues/1987)

### Features

- **html-spec:** add 41 DPub ARIA roles to generated spec data ([a98b9e5](https://github.com/markuplint/markuplint/commit/a98b9e53b5d96b700e66291dd643534f7df5cbaf))
- **html-spec:** require href or imagesrcset on link element ([e6a2631](https://github.com/markuplint/markuplint/commit/e6a26318ed8e4be9ba4e81884eb0b879a816efb5)), closes [#717](https://github.com/markuplint/markuplint/issues/717)

# [4.17.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.16.1...@markuplint/html-spec@4.17.0) (2026-02-10)

### Bug Fixes

- **html-spec:** add math and meter to img permitted roles ([97c9de0](https://github.com/markuplint/markuplint/commit/97c9de0596d2b9b17f91c875e853def4e45ec36b))
- **html-spec:** add permitted roles to button per html-aria ([1bcdf1b](https://github.com/markuplint/markuplint/commit/1bcdf1b2894908a4d05d80458cfb5ccbbc1029b8))
- **html-spec:** correct implicit role typo for meter element ([c7dc7c9](https://github.com/markuplint/markuplint/commit/c7dc7c9174047248f9170925b22d4fea5984b49d))
- **html-spec:** revert over-applied role description changes ([fbc8a46](https://github.com/markuplint/markuplint/commit/fbc8a46f570ccebcafda7825305285002573df31))
- **html-spec:** update html element implicit role to generic ([862a67d](https://github.com/markuplint/markuplint/commit/862a67d9283cec6854b0ab7ef678d3fa3516f3fe)), closes [w3c/aria#2504](https://github.com/w3c/aria/issues/2504) [w3c/html-aria#550](https://github.com/w3c/html-aria/issues/550)
- **spec-generator:** merge MDN data into spec-defined attributes ([ae4db37](https://github.com/markuplint/markuplint/commit/ae4db37b109bac3daed22d8ba0a147acf2d71787))

### Features

- **html-spec:** add headingoffset and headingreset attributes ([49aa8e7](https://github.com/markuplint/markuplint/commit/49aa8e72346ea61cb62db8239ef9fe99b8a4eac3)), closes [whatwg/html#11086](https://github.com/whatwg/html/issues/11086) [whatwg/html#11979](https://github.com/whatwg/html/issues/11979)
- **html-spec:** add iframe privateToken attribute ([6d6a45d](https://github.com/markuplint/markuplint/commit/6d6a45d2615f95b964e479c26e13ed3904ecfeb8))
- **html-spec:** add input switch attribute ([3f77351](https://github.com/markuplint/markuplint/commit/3f773515c12349b88524991ddbefc8bd7206a2c9))
- **html-spec:** add interestfor attribute (Interest Invokers API) ([1230b8b](https://github.com/markuplint/markuplint/commit/1230b8be720a78d615c1d5ca5873e6c725e6bb92))
- **html-spec:** add request-close to button command attribute ([46c6093](https://github.com/markuplint/markuplint/commit/46c60938ceb37f094ab58ff034d01d4489c1ffa6))
- **html-spec:** add svg:switch requiredExtensions and systemLanguage attributes ([481a836](https://github.com/markuplint/markuplint/commit/481a83693ccfc6b7147783c9d841ea2d96fadfef))
- **html-spec:** add template shadowrootreferencetarget attribute ([dd78b8a](https://github.com/markuplint/markuplint/commit/dd78b8a75e4a034555741b4595c95cb535370ad0))
- **html-spec:** deprecate attributionsrc attribute ([e12cf46](https://github.com/markuplint/markuplint/commit/e12cf4625e778e9e64ba6aef08b0e7c5b18b8c29))
- **html-spec:** deprecate browsingtopics attribute on iframe ([27f54cf](https://github.com/markuplint/markuplint/commit/27f54cf3d349089ef2a972d14a386bfd9b2909c9))
- **html-spec:** update scrollbar aria-controls from required to inherited ([14aeec5](https://github.com/markuplint/markuplint/commit/14aeec5e4e01ef32ba147a9ff49a5d5c44558901))

## [4.16.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.16.0...@markuplint/html-spec@4.16.1) (2025-11-05)

**Note:** Version bump only for package @markuplint/html-spec

# [4.16.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.15.0...@markuplint/html-spec@4.16.0) (2025-08-24)

### Features

- **html-spec:** implement link type definitions for rel attributes ([0bfa05f](https://github.com/markuplint/markuplint/commit/0bfa05fa39fbcff99e237eb628e89ea2090abd92))
- **html-spec:** update element references for new MDN URL structure ([452eebb](https://github.com/markuplint/markuplint/commit/452eebb9a4e7d75aca9ff15ee023935206ae237e))

# [4.15.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.14.2...@markuplint/html-spec@4.15.0) (2025-08-13)

### Bug Fixes

- **html-spec:** format attribute value types with proper spacing ([b726ab9](https://github.com/markuplint/markuplint/commit/b726ab97faeee186e0f05f6690de338d7182a060))
- **html-spec:** update img src/srcset attributes to be mutually required ([1a9a611](https://github.com/markuplint/markuplint/commit/1a9a61102468407ef254e970c2903a69d9ec6465))

### Features

- **html-spec:** add compact attribute to dl element ([936aa24](https://github.com/markuplint/markuplint/commit/936aa24ebc4f1e6122a167466ccd4c63025e8ca2))
- **html-spec:** add compact attribute to menu element ([d4c16f8](https://github.com/markuplint/markuplint/commit/d4c16f89fe1f3a8acb08e3e83cb23e260c017ec6))
- **html-spec:** add compact attribute to ol element ([a19785b](https://github.com/markuplint/markuplint/commit/a19785b2af45b6ceb65a66b8ef1162b385b15684))
- **html-spec:** add fetchpriority attribute to SVG script element ([2669d23](https://github.com/markuplint/markuplint/commit/2669d238e0496c5c57b2ca9182685db420312103))
- **html-spec:** add mask-type attribute to SVG mask element ([9e27e27](https://github.com/markuplint/markuplint/commit/9e27e27eae2166e99cb124725a299c317a1736d9))
- **html-spec:** remove form attribute from meter element ([1cee2cb](https://github.com/markuplint/markuplint/commit/1cee2cb54f18e38c8ec652ddfd5f382e757eb1b4))
- **html-spec:** remove the `cursor` SVG element ([43d224f](https://github.com/markuplint/markuplint/commit/43d224f598a0735da95f5754bb1c5577eb091b2a))
- **html-spec:** remove the `khern` SVG element ([4c05a01](https://github.com/markuplint/markuplint/commit/4c05a010f33100d912d851731eb689b938b0be99))
- **html-spec:** remove the `missing` SVG element ([c66f316](https://github.com/markuplint/markuplint/commit/c66f316210e0fc185be8c1fe3d33798ed0492b4d))
- **html-spec:** remove the `tref` SVG element ([520c81f](https://github.com/markuplint/markuplint/commit/520c81f4e391486feea574e99e163faf3b129601))
- **html-spec:** remove the `vkern` SVG element ([aadd4cc](https://github.com/markuplint/markuplint/commit/aadd4cc91bb6622c64bcb1b1d5beff9759bdbbb6))
- **html-spec:** update accessibleNameRequired for specific roles ([4e79515](https://github.com/markuplint/markuplint/commit/4e79515a86bd488cb2a8156ad11fcb9a9967453e))
- **html-spec:** update descriptions for specific roles ([f018270](https://github.com/markuplint/markuplint/commit/f018270b0d3a301899a7a66c22d4c7ed9c1199fe))
- **html-spec:** update tree role required owned elements based on ARIA spec change ([0e681bb](https://github.com/markuplint/markuplint/commit/0e681bb686869c01e33a67dd65445ff4dc0c1b1c))

## [4.14.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.14.1...@markuplint/html-spec@4.14.2) (2025-04-13)

**Note:** Version bump only for package @markuplint/html-spec

## [4.14.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.14.0...@markuplint/html-spec@4.14.1) (2025-03-09)

**Note:** Version bump only for package @markuplint/html-spec

# [4.14.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.13.0...@markuplint/html-spec@4.14.0) (2025-02-27)

### Bug Fixes

- **html-spec:** apply missing flag removal for Invoker Commands API ([98a196d](https://github.com/markuplint/markuplint/commit/98a196d99b6b9e84f46716c760523040b657e98b))
- **html-spec:** fix required attrs and conditional attrs of the `picture` element ([60f9089](https://github.com/markuplint/markuplint/commit/60f908979238d98950a7141cf74b6925f829283e))

### Features

- **html-spec:** remove experimental flag for Invoker Commands API ([8df79ab](https://github.com/markuplint/markuplint/commit/8df79ab42d2c0a6eb6708ac8a50786aad6f630b6))

# [4.13.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.12.0...@markuplint/html-spec@4.13.0) (2025-02-11)

### Features

- **html-spec:** add the ARIA roles `sectionheader` and `sectionfooter` ([53bdf8e](https://github.com/markuplint/markuplint/commit/53bdf8e77642b352af5d05a476c9a32e7d2fcce0))
- **html-spec:** remove the `portal` HTML element https://github.com/mdn/content/pull/37880 ([0711113](https://github.com/markuplint/markuplint/commit/0711113d5ec5dc0a66374c364ed071c53a212150))
- **html-spec:** remove the SVG elements `font`, `glyph`, and `glyphRef` ([d6e69bd](https://github.com/markuplint/markuplint/commit/d6e69bd9755d195a008b0ccd34d3c28f59b17f69))

# [4.12.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.11.1...@markuplint/html-spec@4.12.0) (2025-02-04)

### Features

- **html-spec:** add the `closedby` attr to the `dialog` element ([6f4812f](https://github.com/markuplint/markuplint/commit/6f4812f50829d21d6c1ffdcebdd2595b74180728))
- **html-spec:** add the `hint` enum value to the `popover` attribute ([1de0000](https://github.com/markuplint/markuplint/commit/1de00003160c9271ab9805bb4c6d0253b3d1f515))

## [4.11.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.11.0...@markuplint/html-spec@4.11.1) (2024-12-04)

**Note:** Version bump only for package @markuplint/html-spec

# [4.11.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.10.2...@markuplint/html-spec@4.11.0) (2024-11-17)

### Features

- **html-spec:** add `command` and `commandfor` attributes with the `command` event ([19142ab](https://github.com/markuplint/markuplint/commit/19142abe2dbefdf9b333ea43001f7492793cf93e))
- **html-spec:** remove `nonStandard` flag from the deprecated `type` attr of the `li` element ([a28cd02](https://github.com/markuplint/markuplint/commit/a28cd02fc870f155eaad6240a310aeb410b55e30))

## [4.10.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.10.1...@markuplint/html-spec@4.10.2) (2024-10-31)

**Note:** Version bump only for package @markuplint/html-spec

## [4.10.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.10.0...@markuplint/html-spec@4.10.1) (2024-10-28)

**Note:** Version bump only for package @markuplint/html-spec

# [4.10.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.9.3...@markuplint/html-spec@4.10.0) (2024-10-27)

### Features

- **html-spec:** add the `alpha` attr to `<input type=color>` ([fd877fc](https://github.com/markuplint/markuplint/commit/fd877fc5213212e266068488bdf6d18d6d356574))
- **html-spec:** add the `autocorrect` global attribute ([8035fbd](https://github.com/markuplint/markuplint/commit/8035fbd183c3eb1ab722eb7093a8e5916cf4ba25))
- **html-spec:** add the `colorspace` attr to `<input type=color>` ([93b8c2b](https://github.com/markuplint/markuplint/commit/93b8c2b53d59f27bb608e31e49ae3c4b315579ae))

## [4.9.3](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.9.2...@markuplint/html-spec@4.9.3) (2024-10-15)

**Note:** Version bump only for package @markuplint/html-spec

## [4.9.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.9.1...@markuplint/html-spec@4.9.2) (2024-10-14)

**Note:** Version bump only for package @markuplint/html-spec

## [4.9.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.9.0...@markuplint/html-spec@4.9.1) (2024-09-23)

**Note:** Version bump only for package @markuplint/html-spec

# [4.9.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.8.2...@markuplint/html-spec@4.9.0) (2024-09-02)

### Features

- **html-spec:** add the `attributionsrc` attr as experimental to `a`, `img`, and `script` elements ([2f44802](https://github.com/markuplint/markuplint/commit/2f44802264e3b51fa8f264536637bf419c86ca05))
- **html-spec:** remove `onredo` and `onundo` attributes from the `body` element ([b428fb5](https://github.com/markuplint/markuplint/commit/b428fb5fcd3e0e28d9ed85eb93cf6aad7f081942))
- **html-spec:** remove attributes from the obsolete `menuitem` element ([32d8c41](https://github.com/markuplint/markuplint/commit/32d8c415b03fbe68d5513d16fcaebf7318d289bf))
- **html-spec:** remove the `cols` attribute from the `pre` element ([7605d7d](https://github.com/markuplint/markuplint/commit/7605d7db3c9dd40e190b37580d6fb53c75cff692))
- **html-spec:** remove the `manifest` attribute from the `html` element ([5954a44](https://github.com/markuplint/markuplint/commit/5954a4490018d178ae71324badfcf1a352d9b07f))
- **html-spec:** remove the `methods` attribute from the `link` element ([481a9b4](https://github.com/markuplint/markuplint/commit/481a9b49bef3f5b5546f569c24dd956b5a3dcd54))

## [4.8.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.8.1...@markuplint/html-spec@4.8.2) (2024-06-25)

### Bug Fixes

- **html-spec:** update content model for div element within dl element ([9d5ba90](https://github.com/markuplint/markuplint/commit/9d5ba90f0704748513bd257aab74584ff3cdaef3))

## [4.8.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.8.0...@markuplint/html-spec@4.8.1) (2024-06-09)

**Note:** Version bump only for package @markuplint/html-spec

# [4.8.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.7.2...@markuplint/html-spec@4.8.0) (2024-05-28)

### Features

- **html-spec:** add the new `shadowrootserializable` attribute to the `template` element ([0ffbace](https://github.com/markuplint/markuplint/commit/0ffbace70332dfc7394bdb79c58abf1695c7fe5b))
- **html-spec:** exports JSON directly ([38489bb](https://github.com/markuplint/markuplint/commit/38489bbac006ecdfd5af6a4a55db5fb46c281202))

## [4.7.2](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.7.1...@markuplint/html-spec@4.7.2) (2024-05-12)

**Note:** Version bump only for package @markuplint/html-spec

## [4.7.1](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.7.1-alpha.0...@markuplint/html-spec@4.7.1) (2024-05-04)

**Note:** Version bump only for package @markuplint/html-spec

## [4.7.1-alpha.0](https://github.com/markuplint/markuplint/compare/@markuplint/html-spec@4.7.0...@markuplint/html-spec@4.7.1-alpha.0) (2024-05-04)

**Note:** Version bump only for package @markuplint/html-spec
