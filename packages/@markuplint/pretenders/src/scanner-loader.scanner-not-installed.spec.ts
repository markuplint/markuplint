import { afterEach, describe, expect, test, vi } from 'vitest';

import { getScanner } from './scanner-loader.js';

/**
 * The Astro parser is made to be missing, as Node reports a package that is not installed: the code
 * `ERR_MODULE_NOT_FOUND`, and a message that names the package. Vitest wraps an error thrown by a mock
 * factory in its own, which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/astro-parser/component-scanner', () => ({
	get componentScanner() {
		throw Object.assign(
			new Error(
				"Cannot find package '@markuplint/astro-parser' imported from /project/node_modules/@markuplint/pretenders/lib/scanner-loader.js",
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

describe('getScanner of an extension whose parser package is not installed', () => {
	test('has no scanner and warns that the parser package is not installed', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(await getScanner('.astro')).toBeNull();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			'Parser package "@markuplint/astro-parser" is not installed. Skipping .astro files.',
		);
	});
});
