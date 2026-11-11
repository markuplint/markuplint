import { afterEach, describe, expect, test, vi } from 'vitest';

import { getScanner } from './scanner-loader.js';

/**
 * The Astro parser is installed, but a module its scanner needs is not: Node reports `ERR_MODULE_NOT_FOUND`
 * with a message that names that module, not the parser. Vitest wraps an error thrown by a mock factory in
 * its own, which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/astro-parser/component-scanner', () => ({
	get componentScanner() {
		throw Object.assign(
			new Error(
				"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/astro-parser/lib/component-scanner.js",
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

describe('getScanner of an extension whose scanner fails to load for a missing dependency', () => {
	test('has no scanner and warns of the fault, not of a parser that is not installed', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(await getScanner('.astro')).toBeNull();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			'Failed to load component scanner for .astro:',
			"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/astro-parser/lib/component-scanner.js",
		);
	});
});
