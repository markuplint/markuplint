import { describe, test, expect } from 'vitest';

import { usedPluginNames } from './used-plugin-names.js';

describe('usedPluginNames', () => {
	test('the names of the plugins of a markuplint that has them', () => {
		expect(usedPluginNames({ plugins: [{ name: 'a' }, { name: '@scope/b', foo: 1 }] })).toStrictEqual([
			'a',
			'@scope/b',
		]);
	});

	test('an entry without a name is left out', () => {
		expect(usedPluginNames({ plugins: [{ foo: 1 }, { name: 'a' }, null] })).toStrictEqual(['a']);
	});

	test('an empty list stays empty, so that the log can say there are none', () => {
		expect(usedPluginNames({ plugins: [] })).toStrictEqual([]);
	});

	test('undefined for a markuplint without the plugin mechanism (v6)', () => {
		expect(usedPluginNames({ files: new Set(), errs: [] })).toBeUndefined();
	});

	test('undefined when `plugins` is not a list', () => {
		expect(usedPluginNames({ plugins: 'a' })).toBeUndefined();
	});
});
