import fs from 'node:fs';
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import {
	clearModuleResolutionCaches,
	isPackageSpecifier,
	normalizePath,
	resolveModuleFile,
} from './resolve-module-file.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', '..', 'test', 'fixtures', 'module-resolution');

describe('resolveModuleFile', () => {
	test('resolves a relative specifier to an absolute file path', () => {
		const importer = path.resolve(fixtureDir, 'relative', 'importer.tsx');
		const resolved = resolveModuleFile(importer, './a');
		expect(resolved).toBe(normalizePath(path.resolve(fixtureDir, 'relative', 'a.tsx')));
	});

	test('resolves a tsconfig `paths` alias', () => {
		const importer = path.resolve(fixtureDir, 'with-alias', 'src', 'pages', 'Page.tsx');
		const resolved = resolveModuleFile(importer, '@/components/Button');
		expect(resolved).toBe(normalizePath(path.resolve(fixtureDir, 'with-alias', 'src', 'components', 'Button.tsx')));
	});

	test('resolves a relative specifier pointing at a .vue file', () => {
		const importer = path.resolve(fixtureDir, 'vue-relative', 'importer.tsx');
		const resolved = resolveModuleFile(importer, './Button.vue');
		expect(resolved).toBe(normalizePath(path.resolve(fixtureDir, 'vue-relative', 'Button.vue')));
	});

	test('returns null for a non-relative specifier that cannot be resolved', () => {
		const importer = path.resolve(fixtureDir, 'relative', 'importer.tsx');
		const resolved = resolveModuleFile(importer, 'nonexistent-package-xyz');
		expect(resolved).toBeNull();
	});

	test('returns null for a relative specifier that does not resolve to any file', () => {
		const importer = path.resolve(fixtureDir, 'relative', 'importer.tsx');
		const resolved = resolveModuleFile(importer, './does-not-exist');
		expect(resolved).toBeNull();
	});
});

describe('module resolution cache invalidation (long-running processes)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'resolve-module-file-cache-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('clearModuleResolutionCaches() picks up a newly added tsconfig `paths` alias', async () => {
		const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
		await writeFile(tsconfigPath, JSON.stringify({ compilerOptions: {} }));
		await mkdir(path.join(tmpDir, 'src', 'components'), { recursive: true });
		await writeFile(path.join(tmpDir, 'src', 'components', 'Button.tsx'), 'export const Button = () => null;');
		const importer = path.join(tmpDir, 'src', 'pages', 'Page.tsx');
		await mkdir(path.dirname(importer), { recursive: true });
		await writeFile(importer, "import { Button } from '@/components/Button';");

		// No alias defined yet — resolution fails.
		expect(resolveModuleFile(importer, '@/components/Button')).toBeNull();

		// Add the alias and re-resolve WITHOUT clearing the cache: the parsed
		// tsconfig from before the edit is still used, so it keeps failing.
		await writeFile(
			tsconfigPath,
			JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }),
		);
		expect(resolveModuleFile(importer, '@/components/Button')).toBeNull();

		clearModuleResolutionCaches();

		expect(resolveModuleFile(importer, '@/components/Button')).toBe(
			normalizePath(path.join(tmpDir, 'src', 'components', 'Button.tsx')),
		);
	});
});

describe('Tier 1 (fatal) errors during the relative fallback file search', () => {
	test('rethrows instead of swallowing a fatal error as "file not found"', () => {
		const importer = path.resolve(fixtureDir, 'vue-relative', 'importer.tsx');
		const spy = vi.spyOn(fs, 'statSync').mockImplementation(() => {
			throw new TypeError('boom: implementation bug, not a missing file');
		});
		try {
			expect(() => resolveModuleFile(importer, './Button.vue')).toThrow(TypeError);
		} finally {
			spy.mockRestore();
		}
	});
});

describe('isPackageSpecifier', () => {
	let tmpDir: string;
	let importer: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'resolve-module-file-package-'));
		importer = path.join(tmpDir, 'src', 'Page.tsx');
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		clearModuleResolutionCaches();
	});

	const writeConfig = (compilerOptions: object) =>
		writeFile(path.join(tmpDir, 'tsconfig.json'), JSON.stringify({ compilerOptions }));

	test.each(['ui-lib', 'ui-lib/button', '@org/ui', '@org/ui/button', 'components/Card.vue'])(
		'takes %s for a package when nothing in the tsconfig could stand for it',
		async specifier => {
			await writeConfig({});
			expect(isPackageSpecifier(importer, specifier)).toBe(true);
		},
	);

	test('takes a specifier for a package when there is no tsconfig.json at all', () => {
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(true);
	});

	test.each([
		'./a',
		'../a',
		'/abs/a',
		'@/ui/button',
		'~/ui/button',
		'#internal',
		'node:fs',
		'virtual:icons',
		'Upper/Case',
	])('does not take %s for a package, as its form is not a package name', async specifier => {
		await writeConfig({});
		expect(isPackageSpecifier(importer, specifier)).toBe(false);
	});

	test('does not take a specifier for a package when a `paths` pattern matches it', async () => {
		await writeConfig({ paths: { 'widgets/*': ['./ui/*'], shared: ['./shared'] } });
		expect(isPackageSpecifier(importer, 'widgets/Button.vue')).toBe(false);
		expect(isPackageSpecifier(importer, 'shared')).toBe(false);
	});

	test('matches a `paths` pattern by its prefix and suffix around the `*`', async () => {
		await writeConfig({ paths: { 'lib-*/dist': ['./x'] } });
		expect(isPackageSpecifier(importer, 'lib-core/dist')).toBe(false);
		expect(isPackageSpecifier(importer, 'lib-core/src')).toBe(true);
		expect(isPackageSpecifier(importer, 'lib-/dist')).toBe(false);
	});

	test('a `paths` pattern of a lone `*` matches every specifier', async () => {
		await writeConfig({ paths: { '*': ['./types/*'] } });
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(false);
	});

	test('takes a specifier for a package when no `paths` pattern matches it', async () => {
		await writeConfig({ paths: { 'widgets/*': ['./ui/*'], shared: ['./shared'] } });
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(true);
		expect(isPackageSpecifier(importer, 'shared/extra')).toBe(true);
	});

	test('does not take a bare specifier for a package when the tsconfig has a `baseUrl`', async () => {
		await writeConfig({ baseUrl: '.' });
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(false);
	});

	test('does not take a bare specifier for a package when an extended tsconfig has a `baseUrl`', async () => {
		await writeFile(path.join(tmpDir, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: { baseUrl: '.' } }));
		await writeFile(path.join(tmpDir, 'tsconfig.json'), JSON.stringify({ extends: './tsconfig.base.json' }));
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(false);
	});

	test('does not take a bare specifier for a package when the tsconfig only delegates with `references`', async () => {
		await writeFile(
			path.join(tmpDir, 'tsconfig.json'),
			JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }),
		);
		await writeFile(
			path.join(tmpDir, 'tsconfig.app.json'),
			JSON.stringify({ compilerOptions: { composite: true, paths: { 'components/*': ['./src/*'] } } }),
		);
		expect(isPackageSpecifier(importer, 'components/Button.vue')).toBe(false);
	});

	test('does not take a bare specifier for a package when a jsconfig.json is near', async () => {
		await writeFile(path.join(tmpDir, 'jsconfig.json'), JSON.stringify({ compilerOptions: {} }));
		expect(isPackageSpecifier(importer, 'ui-lib')).toBe(false);
	});

	test('does not take a specifier for a package when it has a `..` segment', async () => {
		await writeConfig({});
		expect(isPackageSpecifier(importer, 'ui-lib/../../x')).toBe(false);
	});

	test('records the tsconfig the decision was made with', async () => {
		await writeConfig({});
		const dependencies = new Set<string>();
		isPackageSpecifier(importer, 'ui-lib', dependencies);
		expect([...dependencies]).toStrictEqual([normalizePath(path.join(tmpDir, 'tsconfig.json'))]);
	});
});

describe('normalizePath', () => {
	test('converts backslashes to forward slashes', () => {
		expect(normalizePath('foo\\bar\\baz.tsx')).toBe('foo/bar/baz.tsx');
	});

	test('leaves forward-slash paths untouched', () => {
		expect(normalizePath('foo/bar/baz.tsx')).toBe('foo/bar/baz.tsx');
	});
});
