import { createRequire } from 'node:module';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

/**
 * Guards the `exports` maps of every published package.
 *
 * Reachability from `require()` is a compatibility contract: the published
 * packages are ESM-only, but Node loads ESM from `require()` synchronously as
 * long as the static module graph has no top-level `await`. An `exports` map
 * without a `require`/`default` condition hides that from CommonJS consumers
 * (`ERR_PACKAGE_PATH_NOT_EXPORTED`), and a top-level `await` anywhere in a
 * graph breaks them with `ERR_REQUIRE_ASYNC_MODULE`. Loading each entry
 * through the real `exports` map catches both.
 *
 * `types` must come first because TypeScript matches conditions in order; a
 * `.d.ts` found next to a `default` target is a coincidence of file layout,
 * not a guarantee.
 *
 * Known limitation: TypeScript's `module: node16` predates `require(esm)` and
 * reports TS1471 for a CommonJS file that requires these packages; `nodenext`
 * resolves them. The packages ship one `.d.ts` and no `.d.cts`.
 *
 * The specs load built output, so `yarn build` must have run (CI restores the
 * build cache before running tests). The `require()` specs run on Node only:
 * Bun and Deno implement `require(esm)` and top-level-`await` detection
 * differently, so their results would not speak for Node consumers.
 */

const packagesDir = path.resolve(import.meta.dirname, '../../..');

interface Conditions {
	readonly [condition: string]: string | Conditions;
}

interface Entry {
	readonly pkg: string;
	readonly dir: string;
	readonly subpath: string;
	readonly conditions: Conditions;
}

const manifestPaths = [
	path.join(packagesDir, 'markuplint', 'package.json'),
	...readdirSync(path.join(packagesDir, '@markuplint')).map(dir =>
		path.join(packagesDir, '@markuplint', dir, 'package.json'),
	),
].filter(p => existsSync(p));

const publicManifests = manifestPaths
	.map(p => ({ dir: path.dirname(p), pkg: JSON.parse(readFileSync(p, 'utf8')) }))
	.filter(({ pkg }) => pkg.private !== true);

const isNode = !('bun' in process.versions) && !('deno' in process.versions);

/**
 * A package without `exports` (`@markuplint/config-presets`, JSON only) restricts
 * nothing, so it has nothing to check. Subpaths that map straight to a file
 * (`"./package.json"`) have no conditions to check either.
 */
const entries: Entry[] = publicManifests.flatMap(({ dir, pkg }) =>
	Object.entries<string | Conditions>(pkg.exports ?? {}).flatMap(([subpath, target]) =>
		typeof target === 'string' ? [] : [{ pkg: pkg.name as string, dir, subpath, conditions: target }],
	),
);

function typesIsFirst(conditions: Conditions): boolean {
	const keys = Object.keys(conditions);
	if (keys.includes('types') && keys[0] !== 'types') {
		return false;
	}
	return Object.values(conditions).every(value => typeof value === 'string' || typesIsFirst(value));
}

describe('exports of published packages', () => {
	test('scans the published packages', () => {
		const names = publicManifests.map(({ pkg }) => pkg.name);
		expect(names).toContain('markuplint');
		expect(names).toContain('@markuplint/rules');
		expect(names).not.toContain('@markuplint/test-tools');
	});

	test.each(entries)('$pkg $subpath: `types` comes first', ({ conditions }) => {
		expect(typesIsFirst(conditions)).toBe(true);
	});

	test.each(entries)('$pkg $subpath: has a `default` or `require` condition', ({ conditions }) => {
		expect(Object.keys(conditions).some(key => key === 'default' || key === 'require')).toBe(true);
	});

	test.skipIf(!isNode).each(entries)('$pkg $subpath: loads through require()', ({ pkg, dir, subpath }) => {
		const specifier = path.posix.join(pkg, subpath);
		const requireFromPackage = createRequire(path.join(dir, 'package.json'));
		expect(() => requireFromPackage(specifier)).not.toThrow();
	});
});
