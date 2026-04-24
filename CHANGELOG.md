# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [4.18.1](https://github.com/markuplint/markuplint/compare/v4.18.0...v4.18.1) (2026-04-24)

### Bug Fixes

- **ml-config:** restore `oneOf` structure in `rules` definition of `config.schema.json` ([bd74130](https://github.com/markuplint/markuplint/commit/bd74130bbc9e17df06f4b6bfa4d37b66eae0d1c3)), closes [#3743](https://github.com/markuplint/markuplint/issues/3743)
- **vscode:** convert absolute paths to file:// URLs before import ([ad17316](https://github.com/markuplint/markuplint/commit/ad173168c300ea013c3c41407ccd6126d175e2bb)), closes [#3795](https://github.com/markuplint/markuplint/issues/3795)

# [4.18.0](https://github.com/markuplint/markuplint/compare/v4.14.1...v4.18.0) (2026-04-22)

### Bug Fixes

- **deps:** adapt code to breaking changes from upgrade ([ced7fab](https://github.com/markuplint/markuplint/commit/ced7fab5b50ea3effd844e17b1f676fce790b53c))
- disable unicorn/no-array-sort rule and fix no-immediate-mutation ([bf76be2](https://github.com/markuplint/markuplint/commit/bf76be26478aa2a03528f9182cb11d123b44db44))
- resolve additional eslint-plugin-unicorn v63 errors ([e58a72c](https://github.com/markuplint/markuplint/commit/e58a72c17c97bbec522f9513b99777fac6904d64))
- support TypeScript 6.0 ([0dcf708](https://github.com/markuplint/markuplint/commit/0dcf70835eb40b581589c4da824080c512ba198c)), closes [#3759](https://github.com/markuplint/markuplint/issues/3759) [#3759](https://github.com/markuplint/markuplint/issues/3759)
- **test:** force local file: resolution in isolated-env sandbox tests ([d8cfa32](https://github.com/markuplint/markuplint/commit/d8cfa32af8ab2fff9096556a2170e16425a46075)), closes [#ts6](https://github.com/markuplint/markuplint/issues/ts6)
- update glob import to use named export ([c78c98f](https://github.com/markuplint/markuplint/commit/c78c98ff2b4855853f116911eaaf37a773c4ae66))

### Reverts

- keep vitest 3 and plain markuplint ref for CI compat ([82ba2f9](https://github.com/markuplint/markuplint/commit/82ba2f948c33a145b90517033833e11b76f04bb3))
- pin jsdom to 26 for Node 18 support ([a82d280](https://github.com/markuplint/markuplint/commit/a82d280cce06b52746b6a7912b3eca9d22a4296d))
- pin meow and os-locale for Node 18 support ([ed61c88](https://github.com/markuplint/markuplint/commit/ed61c8829aca912b81fd6efb518b4518199db2ca))
- pin uuid to 13 for Node 18 support ([b2bae14](https://github.com/markuplint/markuplint/commit/b2bae1460a0810f6a17fefa2d042d44eab5f0641))
