import { describe, test, expect } from 'vitest';

import { isInternal, readWorkspaceManifests } from './workspace-manifests.js';

/**
 * Guards the `peerDependencies` of the published packages: a peer is how a package that loads another
 * one dynamically (`@markuplint/pretenders` and the parsers it reads) leaves it to the user to install it.
 *
 * A peer on a package of this repository is a caret range of the major the sibling is on, not an
 * exact pin: `lerna version` rewrites a peer only when it uses the `workspace:` protocol, so an exact
 * pin would be left behind at the next release and make the install fail for whoever has the newer
 * package next to it. The version the repository itself tests against is the exact `devDependencies` pin,
 * which `lerna version` does rewrite.
 */

const EXACT_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const CARET_PATTERN = /^\^(\d+)\.(\d+)\.(\d+)$/;
/**
 * A package that is itself a prerelease may lower the bound to a prerelease (`^6.0.0-rc.0`), which is how a
 * range reaches the prereleases of a major that is not out yet; a stable package may not.
 */
const CARET_PRERELEASE_PATTERN = /^\^(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/;

/** The numbers of a version, without the prerelease: `[major, minor, patch]`. */
function numbersOf(version: string) {
	const [core = ''] = version.replace(/^\^/, '').split('-');
	return core.split('.').map(Number);
}

function isAtMost(lower: readonly number[], version: readonly number[]) {
	for (const [i, n] of lower.entries()) {
		const other = version[i] ?? 0;
		if (n !== other) {
			return n < other;
		}
	}
	return true;
}

const manifests = readWorkspaceManifests();

const peers = manifests
	.filter(pkg => pkg.private !== true)
	.flatMap(pkg =>
		Object.entries(pkg.peerDependencies ?? {})
			.filter(([dep]) => isInternal(dep))
			.map(([dep, range]) => ({
				pkg,
				dep,
				range,
				sibling: manifests.find(m => m.name === dep),
				form: pkg.version.includes('-') ? CARET_PRERELEASE_PATTERN : CARET_PATTERN,
			})),
	);

const LOADED_DYNAMICALLY = [
	'@markuplint/pretenders',
	'@markuplint/astro-parser',
	'@markuplint/jsx-parser',
	'@markuplint/mdx-parser',
	'@markuplint/svelte-parser',
	'@markuplint/vue-parser',
];

describe('peerDependencies on a package of this repository', () => {
	test.each(LOADED_DYNAMICALLY)('%s is a peer of a published package', dep => {
		expect(peers.map(p => p.dep)).toContain(dep);
	});

	test.each(peers)('$pkg.name: $dep@$range is a caret range', ({ range, form }) => {
		expect(range).toMatch(form);
	});

	test.each(peers)('$pkg.name: $dep@$range is a range of the major the sibling is on', ({ range, sibling }) => {
		expect(sibling).toBeDefined();
		expect(numbersOf(range)[0]).toBe(numbersOf(sibling!.version)[0]);
	});

	test.each(peers)('$pkg.name: $dep is optional', ({ pkg, dep }) => {
		expect(pkg.peerDependenciesMeta?.[dep]?.optional).toBe(true);
	});

	test.each(peers)('$pkg.name: $dep is not also a dependency of the same package', ({ pkg, dep }) => {
		expect(Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies })).not.toContain(dep);
	});

	test.each(peers)(
		'$pkg.name: $dep is a devDependency pinned exactly, for the tests of the repository',
		({ pkg, dep }) => {
			expect(pkg.devDependencies?.[dep]).toMatch(EXACT_PATTERN);
		},
	);

	test.each(peers)(
		'$pkg.name: the devDependency pin of $dep satisfies the lower bound of $range',
		({ pkg, dep, range }) => {
			const pin = pkg.devDependencies?.[dep] ?? '';
			expect(isAtMost(numbersOf(range), numbersOf(pin))).toBe(true);
		},
	);
});
