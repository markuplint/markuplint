import { afterEach, describe, expect, test, vi } from 'vitest';

import { getLoadedComponentNameRule, loadComponentNameRule } from './scanner-loader.js';

const reads = vi.hoisted(() => ({ count: 0 }));

/**
 * The Astro parser is installed, but a module it needs is not: Node reports `ERR_MODULE_NOT_FOUND` with
 * a message that names that module, not the parser. Vitest wraps an error thrown by a mock factory in
 * its own, which has no `code`, so the export throws it instead, once per load.
 */
vi.mock('@markuplint/astro-parser', () => ({
	get parser() {
		reads.count++;
		throw Object.assign(
			new Error(
				"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/astro-parser/lib/parser.js",
			),
			{
				code: 'ERR_MODULE_NOT_FOUND',
			},
		);
	},
}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('loadComponentNameRule of an extension whose parser fails to load', () => {
	test('has no rule, warns once, and loads the parser again on the next call', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await loadComponentNameRule('.astro');

		expect(getLoadedComponentNameRule('.astro')).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			'Failed to load the parser for .astro:',
			"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/astro-parser/lib/parser.js",
		);

		await loadComponentNameRule('.astro');

		expect(reads.count).toBe(2);
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
