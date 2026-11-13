/**
 * The node types of cheerio's API, read off cheerio's own declarations.
 *
 * cheerio types its nodes with the `domhandler` copy it resolves itself and does
 * not re-export `AnyNode` or `Element`. Importing them from a direct `domhandler`
 * dependency ties the generator to whichever copy that dependency resolves, and
 * once it differs from cheerio's, the generator's un-annotated return types
 * (`getThisOutline` in `utils.ts`) would have to name cheerio's nested copy,
 * which `yarn test:types` rejects with TS2883 ("The inferred type of … cannot be
 * named without a reference to …"). Types read off cheerio's return types stay on
 * cheerio's copy whatever version cheerio moves to.
 *
 * So `domhandler` is not a dependency of this package, and importing it is
 * refused by `no-restricted-imports` in `.oxlintrc.json`. If cheerio starts
 * exporting these types, import them from cheerio and delete this module.
 * `cheerio-types.spec.ts` checks that the derivation still yields cheerio's
 * node types; when a cheerio update fails it there, this module is the place
 * to adjust.
 *
 * @module
 */

import type { Cheerio } from 'cheerio';

/**
 * Constrained to `Cheerio` so that a cheerio update which stops returning one
 * from `contents()` / `children()` fails here, not as a `never` far away.
 */
type NodeOf<C extends Cheerio<unknown>> = C extends Cheerio<infer N> ? N : never;

/** Any node in a cheerio document: what `contents()` returns. */
export type AnyNode = NodeOf<ReturnType<Cheerio<never>['contents']>>;

/** An element node: what `children()` returns. */
export type Element = NodeOf<ReturnType<Cheerio<never>['children']>>;
