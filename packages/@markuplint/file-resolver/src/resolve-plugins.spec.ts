import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from 'vitest';

import { resolvePlugins } from './resolve-plugins.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('resolvePlugins', async () => {
	const { plugins } = await resolvePlugins([path.resolve(__dirname, '..', 'test', 'plugins', '001.js')]);
	expect(plugins[0]?.name).toBe('foo');
	// @ts-ignore
	expect(await plugins[0].rules?.bar?.verify?.()).toEqual([]);
});

test('resolve name', async () => {
	const filePath = path.resolve(__dirname, '..', 'test', 'plugins', '002.js');
	const { plugins } = await resolvePlugins([filePath]);
	expect(plugins[0]?.name).toBe(filePath.toLowerCase().replaceAll(/\s+|[./\\]/g, '-'));
});

test('fail loading', async () => {
	const filePath = path.resolve(__dirname, '..', 'test', 'plugins', 'no-exist.js');
	// @ts-ignore
	expect((await resolvePlugins([filePath])).errors[0].message).toBe(`Plugin not found: ${filePath}`);
});
