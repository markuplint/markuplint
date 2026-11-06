import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { resolveNameOrAbsPath } from './resolve-name-or-abs-path.js';

// The expectations are computed with `path.resolve` as well: a literal would be `/project/a/...`
// on POSIX and `C:\project\a\...` on Windows, and the specs run on both.
const dir = path.resolve('/project', 'a', 'b');

describe('A relative path that also names a file next to the resolver itself', () => {
	// Resolved from the resolver's own file, `../package.json` is the `package.json` of this
	// package and `./resolve-name-or-abs-path.ts` the resolver; neither is what the value names.
	test.each(['../package.json', './resolve-name-or-abs-path.ts'])(
		'%s is resolved from the directory of the configuration, not left as it is',
		async specifier => {
			expect(await resolveNameOrAbsPath(dir, specifier)).toBe(path.resolve(dir, specifier));
		},
	);

	test('with the `!` prefix of an exclusion', async () => {
		expect(await resolveNameOrAbsPath(dir, '!../package.json')).toBe(`!${path.resolve(dir, '../package.json')}`);
	});
});

describe('Any other relative path', () => {
	test.each(['./x.json', '../x.json', '../../../../x.json', '..\\x.json', '.\\x.json', '..', '.'])(
		'%s is resolved from the directory of the configuration',
		async specifier => {
			expect(await resolveNameOrAbsPath(dir, specifier)).toBe(path.resolve(dir, specifier));
		},
	);

	test('an absolute path stays as it is', async () => {
		const abs = path.resolve('/somewhere', 'x.json');
		expect(await resolveNameOrAbsPath(dir, abs)).toBe(abs);
	});
});

describe('A module name', () => {
	test('an installed package stays as it is', async () => {
		expect(await resolveNameOrAbsPath(dir, '@markuplint/ml-config')).toBe('@markuplint/ml-config');
	});

	test('a JSON file of an installed package stays as it is', async () => {
		expect(await resolveNameOrAbsPath(dir, '@markuplint/config-presets/preset.recommended.json')).toBe(
			'@markuplint/config-presets/preset.recommended.json',
		);
	});

	test.each(['markuplint:recommended', 'plugin:foo/bar'])('%s stays as it is', async name => {
		expect(await resolveNameOrAbsPath(dir, name)).toBe(name);
	});

	test('a name that is not installed is resolved from the directory of the configuration', async () => {
		expect(await resolveNameOrAbsPath(dir, 'not-installed/x.json')).toBe(path.resolve(dir, 'not-installed/x.json'));
	});

	// A dot-file name is not a relative path: it is tried as a module like any other name.
	test('a dot-file name that is not installed is resolved from the directory of the configuration', async () => {
		expect(await resolveNameOrAbsPath(dir, '.markuplintrc')).toBe(path.resolve(dir, '.markuplintrc'));
	});

	test('a glob with the `!` prefix is resolved from the directory of the configuration', async () => {
		expect(await resolveNameOrAbsPath(dir, '!**/*.html')).toBe(`!${path.resolve(dir, '**/*.html')}`);
	});
});
