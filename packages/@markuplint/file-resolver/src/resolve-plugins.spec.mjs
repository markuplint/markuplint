import { fileURLToPath } from 'node:url';
import path from 'path';

import { resolvePlugins } from '../lib/resolve-plugins.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('resolvePlugins', async () => {
	const plugins = await resolvePlugins([path.resolve(__dirname, '..', 'test', 'plugins', '001.js')]);
	expect(plugins[0].name).toBe('foo');
	expect(await plugins[0].rules?.bar?.verify?.()).toEqual([]);
});

test('resolve name', async () => {
	const filePath = path.resolve(__dirname, '..', 'test', 'plugins', '002.js');
	const plugins = await resolvePlugins([filePath]);
	expect(plugins[0].name).toBe(filePath.toLowerCase().replace(/\s+|\/|\\|\./g, '-'));
});
