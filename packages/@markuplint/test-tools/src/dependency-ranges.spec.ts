import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

/**
 * Guards the dependency version-specifier policy in the root `CLAUDE.md`
 * (Security → Supply chain) for every published package. An exact pin on a
 * third-party dependency keeps consumers from taking an upstream fix until we
 * release again, so third-party `dependencies` take a caret range, with two
 * kinds of exception listed below.
 */

const packagesDir = path.resolve(import.meta.dirname, '../../..');

/** Ships breaking API changes in minor releases. */
const TILDE = new Set(['typescript']);

/** Must resolve to the same version as each other. */
const EXACT = new Set(['@typescript-eslint/types', '@typescript-eslint/typescript-estree']);

const EXACT_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const TILDE_PATTERN = /^~\d+\.\d+\.\d+$/;
const CARET_PATTERN = /^\^\d+\.\d+\.\d+$/;

interface Entry {
	readonly pkg: string;
	readonly dep: string;
	readonly range: string;
	readonly expected: RegExp;
}

function isInternal(name: string) {
	return name === 'markuplint' || name.startsWith('@markuplint/');
}

function expectedPattern(name: string) {
	if (isInternal(name) || EXACT.has(name)) {
		return EXACT_PATTERN;
	}
	if (TILDE.has(name)) {
		return TILDE_PATTERN;
	}
	return CARET_PATTERN;
}

const manifestPaths = [
	path.join(packagesDir, 'markuplint', 'package.json'),
	...readdirSync(path.join(packagesDir, '@markuplint')).map(dir =>
		path.join(packagesDir, '@markuplint', dir, 'package.json'),
	),
].filter(p => existsSync(p));

const publicManifests = manifestPaths.map(p => JSON.parse(readFileSync(p, 'utf8'))).filter(pkg => pkg.private !== true);

const entries: Entry[] = publicManifests.flatMap(pkg =>
	Object.entries<string>({ ...pkg.dependencies, ...pkg.optionalDependencies }).map(([dep, range]) => ({
		pkg: pkg.name,
		dep,
		range,
		expected: expectedPattern(dep),
	})),
);

describe('dependency version specifiers of published packages', () => {
	test('scans the published packages', () => {
		const names = publicManifests.map(pkg => pkg.name);
		expect(names).toContain('markuplint');
		expect(names).toContain('@markuplint/vue-parser');
		expect(names).not.toContain('@markuplint/test-tools');
	});

	test.each([...TILDE, ...EXACT])('the exception for %s is still in use', dep => {
		expect(entries.map(e => e.dep)).toContain(dep);
	});

	test.each(entries)('$pkg: $dep@$range', ({ range, expected }) => {
		expect(range).toMatch(expected);
	});
});
