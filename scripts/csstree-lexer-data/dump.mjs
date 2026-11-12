/**
 * Writes `crates/markuplint-types/data/csstree-lexer.json`: the syntax dictionary of css-tree's
 * default lexer, which the Rust port of `cssSyntaxMatch` (`crates/markuplint-types/src/css/csstree/`)
 * matches against.
 *
 * The file holds what css-tree builds from its bundled data: every type and property that has a
 * syntax, as css-tree generates it back from its parsed form, and the names of the generic types
 * (`<length>`, `<number>`, …), which css-tree implements as functions and the Rust port implements
 * in code. markuplint's own additions (`css-overrides.ts`, `css-defs.ts`) are not in the file: the
 * Rust port applies them the way TS does, as a fork of this lexer.
 *
 * Run from the repository root after css-tree is updated:
 *
 * ```sh
 * node scripts/csstree-lexer-data/dump.mjs
 * ```
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { lexer } from 'css-tree';

const require = createRequire(import.meta.url);
const { version } = JSON.parse(readFileSync(require.resolve('css-tree/package.json'), 'utf8'));

const dump = lexer.dump(false, true);

/**
 * @param {Record<string, string>} map
 */
function sorted(map) {
	return Object.fromEntries(Object.entries(map).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const generics = Object.keys(lexer.types)
	.filter(name => lexer.types[name].syntax === null)
	.toSorted();

const out = {
	version,
	generics,
	types: sorted(dump.types),
	properties: sorted(dump.properties),
};

const dest = fileURLToPath(new URL('../../crates/markuplint-types/data/csstree-lexer.json', import.meta.url));
writeFileSync(dest, `${JSON.stringify(out, null, '\t')}\n`);
