import path from 'path';

import { resolvePlugins } from './resolve-plugins';

test('resolvePlugins', async () => {
	const plugins = await resolvePlugins([path.resolve(__dirname, '..', 'test', 'plugins', '001.js')]);
	expect(plugins[0].name).toBe('foo');
	expect(plugins[0].rules?.bar?.name).toBe('bar2');
	// @ts-ignore
	expect(await plugins[0].rules?.bar?.verify?.()).toEqual([]);
});

test('resolve name', async () => {
	const filePath = path.resolve(__dirname, '..', 'test', 'plugins', '002.js');
	const plugins = await resolvePlugins([filePath]);
	expect(plugins[0].name).toBe(filePath.toLowerCase().replace(/\s+|\/|\\|\./g, '-'));
});
