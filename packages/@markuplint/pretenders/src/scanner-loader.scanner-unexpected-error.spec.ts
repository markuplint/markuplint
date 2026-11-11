import { afterEach, describe, expect, test, vi } from 'vitest';

import { getScanner } from './scanner-loader.js';

/**
 * The scanner of the Astro parser raises a `TypeError` as it loads, as a broken installation of the parser
 * or of a library it uses can. Vitest wraps an error thrown by a mock factory in its own, so the export
 * throws it instead.
 */
vi.mock('@markuplint/astro-parser/component-scanner', () => ({
	get componentScanner() {
		throw new TypeError('x is not a function');
	},
}));

afterEach(() => {
	vi.restoreAllMocks();
});

describe('getScanner of an extension whose scanner raises an unexpected error as it loads', () => {
	test('has no scanner and warns with the error, so that the run goes on without the language', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		expect(await getScanner('.astro')).toBeNull();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('Failed to load component scanner for .astro:', 'x is not a function');
	});
});
