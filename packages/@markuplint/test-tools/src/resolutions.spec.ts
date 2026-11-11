import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

/**
 * Guards the `resolutions` of the root `package.json` against going stale.
 * A key of the form `<name>@npm:<range>` (for example `undici@npm:7.29.0`)
 * is applied by Yarn only to the dependency declarations that name exactly
 * that descriptor — here, a package that depends on `undici` at `npm:7.29.0`
 * (https://yarnpkg.com/configuration/manifest#resolutions). When the
 * dependent changes its pin, the key matches nothing. Yarn reports nothing
 * for a resolution that matches nothing (the behavior this guard exists
 * for), so the override stops working silently, and whatever the new pin
 * brings in is no longer lifted. The dependency declarations are read from
 * `yarn.lock`, so the check follows what an install resolved, not what a
 * manifest says.
 *
 * A key without a protocol (`undici@7.29.0`) is the same descriptor: the
 * lockfile spells it with `npm:`. A key with another protocol or none at all
 * (such as `markuplint: workspace:*`, which replaces every dependency on a
 * name) is not covered: it has no `npm:` declaration to match.
 *
 * Only the `dependencies` and `optionalDependencies` of a lockfile entry
 * count as declarations. A `peerDependencies` line is a requirement on the
 * consumer, not a dependency that Yarn installs for the entry, so it does
 * not keep a key alive.
 *
 * The lockfile layout is Yarn 4's: an entry is a key at column 0, its fields
 * are indented by 2 spaces, and the declarations of a field by 4. A layout
 * change reports every key as stale, which fails loudly.
 */

const rootDir = path.resolve(import.meta.dirname, '../../../..');

/**
 * @returns The keys of `resolutions` that are an npm descriptor and that no
 *   dependency declaration of `lockfile` names.
 */
function findStaleResolutions(resolutions: Readonly<Record<string, string>>, lockfile: string) {
	const lines = lockfile.split(/\r?\n/);
	return Object.keys(resolutions).filter(key => {
		const matched = /^(?<name>@?[^@]+)@(?<range>.+)$/.exec(key);
		if (!matched?.groups) {
			return false;
		}
		const { name, range } = matched.groups;
		if (!name || !range) {
			return false;
		}
		// `npm:` is the default protocol; a key with any other protocol is not covered.
		const npmRange = range.startsWith('npm:') ? range : range.includes(':') ? null : `npm:${range}`;
		if (npmRange === null) {
			return false;
		}
		// A dependency declaration is an indented `<name>: "npm:<range>"` line of an entry.
		// The name is quoted when it is scoped (`"@scope/name": "npm:1.0.0"`).
		const declarations = new Set([`    ${name}: "${npmRange}"`, `    "${name}": "${npmRange}"`]);
		let field = '';
		for (const line of lines) {
			if (/^\S/.test(line)) {
				field = '';
			} else if (/^ {2}\S.*:$/.test(line)) {
				field = line.trim();
			} else if ((field === 'dependencies:' || field === 'optionalDependencies:') && declarations.has(line)) {
				return false;
			}
		}
		return true;
	});
}

describe('findStaleResolutions', () => {
	const lockfile = [
		'"nx@npm:22.0.0":',
		'  version: 22.0.0',
		'  dependencies:',
		'    tslib: "npm:2.8.1"',
		'    undici: "npm:7.29.0"',
		'    undici-types: "npm:>=7.24.0 <7.24.7"',
		'    "@scope/pkg": "npm:1.2.3"',
	].join('\n');

	test('a descriptor that a dependency declaration names is not stale', () => {
		expect(findStaleResolutions({ 'undici@npm:7.29.0': '7.30.1' }, lockfile)).toEqual([]);
	});

	test('a descriptor of a scoped package is matched by its quoted declaration', () => {
		expect(findStaleResolutions({ '@scope/pkg@npm:1.2.3': '1.2.4' }, lockfile)).toEqual([]);
		expect(findStaleResolutions({ '@scope/pkg@npm:1.2.4': '1.2.5' }, lockfile)).toEqual(['@scope/pkg@npm:1.2.4']);
	});

	test('a range with spaces and operators is matched as written', () => {
		expect(findStaleResolutions({ 'undici-types@npm:>=7.24.0 <7.24.7': '7.24.7' }, lockfile)).toEqual([]);
	});

	test('a key without a protocol is the npm descriptor', () => {
		expect(findStaleResolutions({ 'undici@7.29.0': '7.30.1' }, lockfile)).toEqual([]);
		expect(findStaleResolutions({ 'undici@7.30.0': '7.30.1' }, lockfile)).toEqual(['undici@7.30.0']);
	});

	test('a descriptor whose range no declaration names any more is stale', () => {
		expect(findStaleResolutions({ 'undici@npm:7.30.0': '7.30.1' }, lockfile)).toEqual(['undici@npm:7.30.0']);
	});

	test('a descriptor whose name no declaration names is stale', () => {
		expect(findStaleResolutions({ 'lodash@npm:4.17.21': '4.17.23' }, lockfile)).toEqual(['lodash@npm:4.17.21']);
	});

	test('a range that is only the start of a declared range is stale', () => {
		expect(findStaleResolutions({ 'undici@npm:7.29': '7.30.1' }, lockfile)).toEqual(['undici@npm:7.29']);
	});

	test('a declaration under optionalDependencies keeps a descriptor alive', () => {
		const optional = ['"a@npm:1.0.0":', '  optionalDependencies:', '    undici: "npm:7.29.0"'].join('\n');
		expect(findStaleResolutions({ 'undici@npm:7.29.0': '7.30.1' }, optional)).toEqual([]);
	});

	test('a declaration under peerDependencies does not keep a descriptor alive', () => {
		const peer = ['"a@npm:1.0.0":', '  peerDependencies:', '    undici: "npm:7.29.0"'].join('\n');
		expect(findStaleResolutions({ 'undici@npm:7.29.0': '7.30.1' }, peer)).toEqual(['undici@npm:7.29.0']);
	});

	test('a peer declaration in one entry does not hide a dependency declaration in a later one', () => {
		const both = [
			'"a@npm:1.0.0":',
			'  peerDependencies:',
			'    undici: "npm:7.29.0"',
			'',
			'"b@npm:1.0.0":',
			'  dependencies:',
			'    undici: "npm:7.29.0"',
		].join('\n');
		expect(findStaleResolutions({ 'undici@npm:7.29.0': '7.30.1' }, both)).toEqual([]);
	});

	test('a lockfile with CRLF line endings is read the same', () => {
		expect(findStaleResolutions({ 'undici@npm:7.29.0': '7.30.1' }, lockfile.replaceAll('\n', '\r\n'))).toEqual([]);
	});

	test('no resolutions has nothing stale', () => {
		expect(findStaleResolutions({}, lockfile)).toEqual([]);
	});

	test('a key with another protocol is not covered', () => {
		expect(findStaleResolutions({ markuplint: 'workspace:*' }, lockfile)).toEqual([]);
		expect(findStaleResolutions({ 'foo@patch:foo@npm:1.0.0': 'workspace:*' }, lockfile)).toEqual([]);
	});
});

describe('the resolutions of the root package.json', () => {
	test('every npm descriptor key matches a dependency declaration of yarn.lock', () => {
		const manifest = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
			readonly resolutions?: Readonly<Record<string, string>>;
		};
		const lockfile = readFileSync(path.join(rootDir, 'yarn.lock'), 'utf8');
		expect(findStaleResolutions(manifest.resolutions ?? {}, lockfile)).toEqual([]);
	});
});
