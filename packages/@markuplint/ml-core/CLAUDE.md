# @markuplint/ml-core

## Keeping the MLDOM classes in step with `lib.dom`

`MLElement`, `MLNode`, `MLAttr` and the other MLDOM classes `implements` the DOM interfaces, so a TypeScript release that adds a property or makes one nullable breaks the build with a long list of "is missing the following properties" errors. Fix that by adding the missing stubs and widening types to `| null` where `lib.dom` did, one stub at a time, rebuilding between rounds.

Do not change a parameter or return type from an MLDOM class to the plain DOM type (`MLElement` → `Element`, `MLNode` → `Node`) to make the errors go away. That drops the markuplint-specific type information for every caller, and the error cascade it seems to cure is only the missing stubs. Adding a method overload (for example on `matches()`) counts as a stub and is fine.

## Consumer reports of a type error after a TypeScript release

The `implements` clauses land in the published `.d.ts`, so a consumer whose `lib.dom` is newer than ours (a newer TypeScript, or `libReplacement` with third-party DOM types) gets the same "is missing the following properties" errors from `node_modules/@markuplint/ml-core` without changing anything on their side; `skipLibCheck: false` is enough. Adding the stubs here fixes our build, and the consumer only once they upgrade markuplint. The structural fix — drop `implements` from the public classes and move DOM conformance to a typecheck spec that is not published (`yarn test:types` now type-checks the specs) — is tracked in #4076; check its state before closing another such report with a stub-only release.
