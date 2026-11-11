import { describe, test, expect } from 'vitest';

import { isInternal, readWorkspaceManifests } from './workspace-manifests.js';

/**
 * Guards what installing `markuplint` brings: the packages that it loads only when a configuration needs
 * them (`@markuplint/pretenders`, and the parsers and frameworks behind it) are the user's to install, so
 * they are not reached through `dependencies` or `optionalDependencies` — the latter are installed by
 * default by npm, Yarn and pnpm.
 */

const manifests = new Map(readWorkspaceManifests().map(manifest => [manifest.name, manifest]));

/**
 * Every package of this repository that installing `markuplint` reaches, and the third-party packages they
 * list directly. The dependencies of a third-party package are not followed: they are not this repository's
 * to declare.
 */
function installedWith(name: string) {
	const installed = new Set<string>();
	const queue = [name];
	for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
		if (installed.has(current)) {
			continue;
		}
		installed.add(current);
		const manifest = manifests.get(current);
		if (isInternal(current) && manifest) {
			queue.push(...Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies }));
		}
	}
	return installed;
}

const closure = installedWith('markuplint');

const OPTIONAL = [
	'@markuplint/pretenders',
	'@markuplint/astro-parser',
	'@markuplint/jsx-parser',
	'@markuplint/mdx-parser',
	'@markuplint/svelte-parser',
	'@markuplint/vue-parser',
];

/** What the parsers depend on: a package of this repository that lists one directly brings it in by itself. */
const FRAMEWORK_LIBRARIES = ['vue-eslint-parser', 'svelte', 'astro-eslint-parser'];

describe('what installing markuplint installs', () => {
	test('reaches the core packages', () => {
		expect(closure).toContain('@markuplint/file-resolver');
		expect(closure).toContain('@markuplint/rules');
	});

	test.each(OPTIONAL)('%s is a package of this repository that is not installed with it', name => {
		expect(manifests.has(name)).toBe(true);
		expect(closure).not.toContain(name);
	});

	test.each(FRAMEWORK_LIBRARIES)('%s is not installed with it', name => {
		expect(closure).not.toContain(name);
	});
});
