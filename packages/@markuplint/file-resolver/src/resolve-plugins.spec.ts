import path from 'path';

import { resolvePlugins } from './resolve-plugins';

test('resolvePlugins', async () => {
	const plugins = await resolvePlugins([path.resolve(__dirname, '..', 'test', 'plugins', '001.js')]);
	expect(plugins[0].name).toBe('foo');
	expect(plugins[0].rules?.foo?.name).toBe('foo');
	// @ts-ignore
	expect(await plugins[0].rules?.foo?.verify?.()).toEqual([]);
});

test('resolve name', async () => {
	const plugins = await resolvePlugins(['@markuplint/rules']);
	expect(plugins[0].name).toBe('@markuplint-rules');
});
