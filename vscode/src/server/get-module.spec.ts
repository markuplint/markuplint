import type { Module } from './get-module.js';

import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, test, expect, vi } from 'vitest';

import { createModuleResolver, loadModule, resolveWithRequire, toImportSpecifier } from './get-module.js';

const nodeRequire = createRequire(import.meta.url);

// Bun and Deno run this suite too, but their `require.resolve` reports an ESM-only package
// differently from Node; the language server itself only ever runs on Node.
const isNode = !('Bun' in globalThis) && !('Deno' in globalThis);

const realDeps = {
	requireResolve: (name: string, options: { readonly paths: readonly string[] }) =>
		nodeRequire.resolve(name, { paths: [...options.paths] }),
	readPackageJson: (packageJsonPath: string) => nodeRequire(packageJsonPath),
};

const noop = () => {};

const vscodeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function fakeModule(workspace: string): Module {
	return {
		isLocalModule: true,
		version: '5.0.0',
		moduleType: 'module',
		markuplint: {},
		ariaRecommendedVersion: '1.2',
		workspace,
	};
}

describe('toImportSpecifier', () => {
	test('converts a Windows drive-letter absolute path to a file:// URL', () => {
		expect(toImportSpecifier('C:\\Users\\a\\markuplint\\lib\\index.mjs')).toBe(
			'file:///C:/Users/a/markuplint/lib/index.mjs',
		);
	});

	test('converts a lowercase-drive Windows path to a file:// URL', () => {
		expect(toImportSpecifier('c:\\Users\\name\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
			'file:///c:/Users/name/node_modules/markuplint/lib/index.mjs',
		);
	});

	test('never leaves a bare drive-letter prefix as the import specifier', () => {
		const result = toImportSpecifier('c:\\foo\\bar.mjs');
		expect(result.startsWith('file://')).toBe(true);
		expect(result).not.toMatch(/^c:/);
	});

	test('URL-encodes spaces in Windows paths (Program Files)', () => {
		expect(toImportSpecifier('c:\\Program Files\\node_modules\\markuplint\\lib\\index.mjs')).toBe(
			'file:///c:/Program%20Files/node_modules/markuplint/lib/index.mjs',
		);
	});

	test('URL-encodes non-ASCII characters in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\太郎\\lib.mjs')).toBe('file:///c:/Users/%E5%A4%AA%E9%83%8E/lib.mjs');
	});

	test('URL-encodes reserved characters like # in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\foo#bar\\lib.mjs')).toBe('file:///c:/Users/foo%23bar/lib.mjs');
	});

	test('URL-encodes reserved characters like ? in Windows paths', () => {
		expect(toImportSpecifier('c:\\Users\\foo?\\lib.mjs')).toBe('file:///c:/Users/foo%3F/lib.mjs');
	});

	test('converts a POSIX absolute path to a file:// URL', () => {
		expect(toImportSpecifier('/tmp/markuplint/lib/index.mjs')).toBe('file:///tmp/markuplint/lib/index.mjs');
	});

	test('URL-encodes spaces in POSIX paths', () => {
		expect(toImportSpecifier('/tmp/my project/lib.mjs')).toBe('file:///tmp/my%20project/lib.mjs');
	});

	test('URL-encodes non-ASCII characters in POSIX paths', () => {
		expect(toImportSpecifier('/home/太郎/lib.mjs')).toBe('file:///home/%E5%A4%AA%E9%83%8E/lib.mjs');
	});

	test('URL-encodes reserved characters like # in POSIX paths', () => {
		expect(toImportSpecifier('/home/foo#bar/lib.mjs')).toBe('file:///home/foo%23bar/lib.mjs');
	});

	test('URL-encodes reserved characters like ? in POSIX paths', () => {
		expect(toImportSpecifier('/home/foo?/lib.mjs')).toBe('file:///home/foo%3F/lib.mjs');
	});

	test('does not convert bare module specifiers like "markuplint"', () => {
		expect(toImportSpecifier('markuplint')).toBe('markuplint');
	});

	test('does not convert scoped bare specifiers like "@markuplint/pug-parser"', () => {
		expect(toImportSpecifier('@markuplint/pug-parser')).toBe('@markuplint/pug-parser');
	});

	test('does not accidentally prefix ./ specifiers with file:///', () => {
		expect(toImportSpecifier('./local.js')).toBe('./local.js');
	});

	test('does not convert ../ relative specifiers', () => {
		expect(toImportSpecifier('../lib/index.js')).toBe('../lib/index.js');
	});

	test('does not convert empty strings', () => {
		expect(toImportSpecifier('')).toBe('');
	});

	test('leaves UNC paths as-is for the caller to handle (known limitation)', () => {
		// UNC path handling is tracked as a follow-up (see PR description for #3795).
		// Assert the current behavior so any future change is explicit.
		expect(toImportSpecifier('\\\\server\\share\\foo.mjs')).toBe('\\\\server\\share\\foo.mjs');
	});
});

describe('resolveWithRequire', () => {
	test.skipIf(!isNode)('resolves the markuplint installed upward from the given directory', () => {
		const result = resolveWithRequire(vscodeDir, noop, realDeps);
		expect(path.isAbsolute(result)).toBe(true);
		// `loadModule` reads `<dirname(entry)>/../package.json`; the resolved entry must sit
		// one level below the package root for that lookup to hold.
		const pkg = nodeRequire(path.resolve(path.dirname(result), '..', 'package.json'));
		expect(pkg.name).toBe('markuplint');
	});

	test('rethrows MODULE_NOT_FOUND untouched when nothing is installed upward from the directory', () => {
		const notFound = Object.assign(new Error("Cannot find module 'markuplint'"), { code: 'MODULE_NOT_FOUND' });
		const requireResolve = vi.fn(() => {
			throw notFound;
		});
		const dir = path.join(path.parse(os.tmpdir()).root, 'proj');
		let caught: unknown;
		try {
			resolveWithRequire(dir, noop, { requireResolve, readPackageJson: () => ({}) });
		} catch (error) {
			caught = error;
		}
		expect(caught).toBe(notFound);
		expect(requireResolve).toHaveBeenCalledWith('markuplint', { paths: [dir] });
	});

	test('falls back to the package.json entry point when the main export is not exposed to require', () => {
		const packageJsonPath = path.join(
			path.parse(os.tmpdir()).root,
			'proj',
			'node_modules',
			'markuplint',
			'package.json',
		);
		const notExported = Object.assign(new Error(`No "exports" main defined in ${packageJsonPath}`), {
			code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
		});
		const result = resolveWithRequire(path.dirname(packageJsonPath), noop, {
			requireResolve: () => {
				throw notExported;
			},
			readPackageJson: () => ({ exports: { '.': { import: './lib/index.js' } } }),
		});
		expect(result).toBe(path.resolve(path.dirname(packageJsonPath), 'lib', 'index.js'));
	});

	test('rethrows when the package.json exposes no entry point at all', () => {
		const packageJsonPath = path.join(
			path.parse(os.tmpdir()).root,
			'proj',
			'node_modules',
			'markuplint',
			'package.json',
		);
		const notExported = Object.assign(new Error(`No "exports" main defined in ${packageJsonPath}`), {
			code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
		});
		expect(() =>
			resolveWithRequire(path.dirname(packageJsonPath), noop, {
				requireResolve: () => {
					throw notExported;
				},
				readPackageJson: () => ({ exports: {} }),
			}),
		).toThrow(/No main$/);
	});
});

describe('createModuleResolver', () => {
	const dirA = path.join(path.parse(os.tmpdir()).root, 'repo', 'applications', 'app');
	const dirB = path.join(path.parse(os.tmpdir()).root, 'repo', 'packages', 'foo');

	test('loads a directory once and returns the same module for repeated requests', async () => {
		const load = vi.fn((workspace: string) => Promise.resolve(fakeModule(workspace)));
		const resolve = createModuleResolver({ log: noop, load });
		const first = await resolve(dirA);
		const second = await resolve(dirA);
		expect(load).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
	});

	test('shares a single in-flight load between concurrent requests', async () => {
		const load = vi.fn((workspace: string) => Promise.resolve(fakeModule(workspace)));
		const resolve = createModuleResolver({ log: noop, load });
		const [first, second] = await Promise.all([resolve(dirA), resolve(dirA)]);
		expect(load).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
	});

	test('normalizes the directory so equivalent spellings share one entry', async () => {
		const load = vi.fn((workspace: string) => Promise.resolve(fakeModule(workspace)));
		const resolve = createModuleResolver({ log: noop, load });
		await resolve(dirA);
		await resolve(`${dirA}${path.sep}.`);
		await resolve(`${dirA}${path.sep}`);
		expect(load).toHaveBeenCalledTimes(1);
		expect(load.mock.calls[0]?.[0]).toBe(dirA);
	});

	test('loads each distinct directory separately and reports the first resolution once per directory', async () => {
		const load = vi.fn((workspace: string) => Promise.resolve(fakeModule(workspace)));
		const onFirstResolve = vi.fn();
		const resolve = createModuleResolver({ log: noop, load, onFirstResolve });
		await resolve(dirA);
		await resolve(dirB);
		await resolve(dirA);
		expect(load).toHaveBeenCalledTimes(2);
		expect(onFirstResolve).toHaveBeenCalledTimes(2);
		expect(onFirstResolve.mock.calls.map(([mod]) => mod.workspace)).toEqual([dirA, dirB]);
	});

	test('forgets a failed load so the next request retries', async () => {
		const load = vi
			.fn<(workspace: string) => Promise<Module>>()
			.mockRejectedValueOnce(new Error('boom'))
			.mockImplementation(workspace => Promise.resolve(fakeModule(workspace)));
		const onFirstResolve = vi.fn();
		const resolve = createModuleResolver({ log: noop, load, onFirstResolve });
		await expect(resolve(dirA)).rejects.toThrow('boom');
		const mod = await resolve(dirA);
		expect(load).toHaveBeenCalledTimes(2);
		expect(mod.workspace).toBe(dirA);
		expect(onFirstResolve).toHaveBeenCalledTimes(1);
	});

	test('logs a failing first-resolve notice without breaking the resolution', async () => {
		const log = vi.fn();
		const load = vi.fn((workspace: string) => Promise.resolve(fakeModule(workspace)));
		const resolve = createModuleResolver({
			log,
			load,
			onFirstResolve: () => {
				throw new Error('notice failed');
			},
		});
		const mod = await resolve(dirA);
		expect(mod.workspace).toBe(dirA);
		await vi.waitFor(() =>
			expect(log).toHaveBeenCalledWith(`Module notice failed for ${dirA}: Error: notice failed`, 'error'),
		);
	});
});

describe('loadModule', () => {
	const workspace = path.join(path.parse(os.tmpdir()).root, 'repo', 'app');
	const entry = path.join(workspace, 'node_modules', 'markuplint', 'lib', 'index.js');
	const localExports = { MLEngine: class Local {} };
	const bundledExports = { MLEngine: class Bundled {} };
	const notFound = Object.assign(new Error("Cannot find module 'markuplint'"), { code: 'MODULE_NOT_FOUND' });

	type Deps = NonNullable<Parameters<typeof loadModule>[2]>;

	function deps(overrides: Partial<Deps> = {}): Deps {
		return {
			resolveEntry: vi.fn(() => entry),
			importModule: vi.fn((specifier: string) =>
				Promise.resolve(specifier === 'markuplint' ? bundledExports : localExports),
			),
			importBundledPackageJson: vi.fn(() => Promise.resolve({ version: '5.0.0', type: 'module' })),
			readPackageJson: vi.fn(() => ({ version: '4.12.0', type: 'module' })),
			...overrides,
		};
	}

	test('loads the installation resolved from the workspace and reads its package.json', async () => {
		const d = deps();
		const mod = await loadModule(workspace, noop, d);
		expect(mod.isLocalModule).toBe(true);
		expect(mod.version).toBe('4.12.0');
		expect(mod.moduleType).toBe('module');
		expect(mod.workspace).toBe(workspace);
		expect(mod.fallbackReason).toBeUndefined();
		expect(mod.markuplint).toBe(localExports);
		expect(d.resolveEntry).toHaveBeenCalledWith(workspace, expect.any(Function));
		expect(d.importModule).toHaveBeenCalledWith(toImportSpecifier(entry));
		expect(d.readPackageJson).toHaveBeenCalledWith(path.resolve(path.dirname(entry), '..', 'package.json'));
	});

	test('falls back to the bundled module when nothing is installed upward from the workspace', async () => {
		const d = deps({
			resolveEntry: vi.fn(() => {
				throw notFound;
			}),
		});
		const mod = await loadModule(workspace, noop, d);
		expect(mod.isLocalModule).toBe(false);
		expect(mod.version).toBe('5.0.0');
		expect(mod.workspace).toBe(workspace);
		expect(mod.fallbackReason).toBeUndefined();
		expect(mod.markuplint).toBe(bundledExports);
	});

	test('records the import assertion incompatibility when the local module fails to import', async () => {
		const d = deps({
			importModule: vi.fn((specifier: string) =>
				specifier === 'markuplint'
					? Promise.resolve(bundledExports)
					: Promise.reject(new SyntaxError("Unexpected identifier 'assert'")),
			),
		});
		const mod = await loadModule(workspace, noop, d);
		expect(mod.isLocalModule).toBe(false);
		expect(mod.version).toBe('5.0.0');
		expect(mod.fallbackReason).toBe('import-assertion-compat');
		expect(mod.markuplint).toBe(bundledExports);
	});

	test('rethrows when the bundled module cannot be imported either', async () => {
		const d = deps({
			resolveEntry: vi.fn(() => {
				throw notFound;
			}),
			importModule: vi.fn(() => Promise.reject(new Error('bundle missing'))),
		});
		await expect(loadModule(workspace, noop, d)).rejects.toThrow('bundle missing');
	});
});
