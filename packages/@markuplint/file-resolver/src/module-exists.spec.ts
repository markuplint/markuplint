import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { moduleExists } from './module-exists.js';

describe('A relative path is not a module', () => {
	// Resolved from this file, `../package.json` is the `package.json` of this package and
	// `./module-exists.ts` this file; neither makes the value a module.
	test.each(['../package.json', './module-exists.ts', '..', '.', '..\\package.json', '.\\module-exists.ts'])(
		'%s',
		async specifier => {
			expect(await moduleExists(specifier)).toBe(false);
		},
	);
});

describe('A module', () => {
	test('an installed package', async () => {
		expect(await moduleExists('@markuplint/ml-config')).toBe(true);
	});

	test('a JSON file of an installed package', async () => {
		expect(await moduleExists('@markuplint/config-presets/preset.recommended.json')).toBe(true);
	});

	test('a file by its absolute path', async () => {
		expect(await moduleExists(path.resolve(import.meta.dirname, '..', 'package.json'))).toBe(true);
	});

	test('a package that is not installed', async () => {
		expect(await moduleExists('not-installed-package')).toBe(false);
	});

	test('a dot-file name that is not installed', async () => {
		expect(await moduleExists('.markuplintrc')).toBe(false);
	});
});
