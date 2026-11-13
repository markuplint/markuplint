import type { PluginOption } from 'vite';

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { missingPackageOf } from '@markuplint/shared';
import { describe, test, expect, vi } from 'vitest';

import { nodeBareSpecifierResolution } from './vitest-node-resolution.ts';

const root = path.resolve(import.meta.dirname, '..');
const plugin = nodeBareSpecifierResolution();
{
	const hook = plugin.configResolved;
	const handler = typeof hook === 'function' ? hook : hook?.handler;
	void handler?.call({} as never, { root } as never);
}

vi.mock('markuplint-uninstalled-package', () => ({ mocked: 'uninstalled' }));
// The name of the `test/` directory at the repository root, which the case for it asserts exists.
vi.mock('test', () => ({ mocked: 'directory' }));

/**
 * A variable keeps Vite's import analysis from resolving the specifier at
 * transform time, so the import takes the runtime path that `import(name)` in
 * `@markuplint/file-resolver` takes.
 */
function load(specifier: string): Promise<Record<string, unknown>> {
	return import(specifier);
}

function resolveId(id: string, importer?: string): unknown {
	const hook = plugin.resolveId;
	const handler = typeof hook === 'function' ? hook : hook?.handler;
	return handler?.call({} as never, id, importer, { isEntry: false } as never);
}

async function pluginNames(option: PluginOption): Promise<string[]> {
	const resolved = await option;
	if (Array.isArray(resolved)) {
		const names = await Promise.all(resolved.map(pluginNames));
		return names.flat();
	}
	return resolved ? [resolved.name] : [];
}

test('every vitest config at the repository root loads the plugin', async () => {
	const configs = readdirSync(root).filter(name => /^vitest[^/]*\.config\.ts$/.test(name));
	expect(configs.length).toBeGreaterThan(0);
	for (const name of configs) {
		const config = (await import(pathToFileURL(path.join(root, name)).href)) as {
			default: { plugins?: PluginOption[] };
		};
		expect(await pluginNames(config.default.plugins ?? []), name).toContain(plugin.name);
	}
});

describe('the specifiers the plugin leaves to Vite and vitest', () => {
	test.each([
		'node:fs',
		'https://example.com/x.js',
		'\0virtual',
		'./package.json',
		'../package.json',
		'/package.json',
		'.',
		'..',
		// A file name longer than the 255 bytes that a file system allows
		'x'.repeat(300),
		'markuplint-uninstalled-package',
		'test',
		'packages/markuplint',
	])('%s', id => {
		expect(resolveId(id, import.meta.filename)).toBeNull();
	});
});

describe('the specifiers the plugin refuses', () => {
	test('the importer is kept apart, so each importer gets its own error', () => {
		expect(resolveId('package.json', '/a.ts')).not.toBe(resolveId('package.json', '/b.ts'));
	});

	test('one imported by no module is reported as imported from the root', async () => {
		const id = resolveId('package.json');
		expect(typeof id).toBe('string');
		const hook = plugin.load;
		const handler = typeof hook === 'function' ? hook : hook?.handler;
		const code = await handler?.call({} as never, id as string);
		expect(code).toContain(JSON.stringify(`Cannot find package 'package.json' imported from ${root}`).slice(1, -1));
	});
});

describe('a bare specifier in a spec resolves as Node.js resolves it', () => {
	test.each([
		['package.json', 'package.json'],
		['packages/markuplint/package.json', 'packages'],
	])('%s, a file at the repository root, is a package %s that is not found', async (specifier, name) => {
		const error = await load(specifier).catch((error_: unknown) => error_);
		expect(error).toMatchObject({
			code: 'ERR_MODULE_NOT_FOUND',
			message: `Cannot find package '${name}' imported from ${import.meta.filename}`,
		});
		expect(missingPackageOf(error)).toBe(name);
	});

	test('a second import of the same one is not found again', async () => {
		await expect(load('package.json')).rejects.toThrow(expect.objectContaining({ code: 'ERR_MODULE_NOT_FOUND' }));
		await expect(load('package.json')).rejects.toThrow(expect.objectContaining({ code: 'ERR_MODULE_NOT_FOUND' }));
	});

	test.each(['packages/markuplint/package.json?raw', 'package.json/x'])(
		'%s, which names no file, is not found by vitest itself',
		async specifier => {
			await expect(load(specifier)).rejects.toThrow(expect.objectContaining({ code: 'ERR_MODULE_NOT_FOUND' }));
		},
	);

	test('one that names an installed package is loaded', async () => {
		const mod = await load('@markuplint/shared');
		expect(mod).toHaveProperty('isFatalError');
	});

	test('one that exists nowhere is left to vi.mock()', async () => {
		const mod = await load('markuplint-uninstalled-package');
		expect(mod).toHaveProperty('mocked', 'uninstalled');
	});

	test('one that names a directory at the repository root is left to vi.mock()', async () => {
		expect(statSync(path.join(root, 'test')).isDirectory()).toBe(true);
		const mod = await load('test');
		expect(mod).toHaveProperty('mocked', 'directory');
	});
});
