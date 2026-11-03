import { describe, expect, test, vi } from 'vitest';

import { resolvePretenders } from './resolve-pretenders.js';

/**
 * `@markuplint/pretenders` is installed, but a module it needs is not: Node reports `ERR_MODULE_NOT_FOUND`
 * with a message that names that module, not the package. Vitest wraps an error thrown by a mock factory in
 * its own, which has no `code`, so the export throws it instead.
 */
vi.mock('@markuplint/pretenders', () => ({
	get scan() {
		throw Object.assign(
			new Error(
				"Cannot find package 'some-dependency' imported from /project/node_modules/@markuplint/pretenders/lib/scan.js",
			),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		);
	},
}));

describe('resolution that needs @markuplint/pretenders when it is installed but fails to load', () => {
	test('throws the error as it is, which names the module, and does not tell to install the package', async () => {
		const promise = resolvePretenders({ scan: [{ files: './nothing/*.vue' }] });

		await expect(promise).rejects.toMatchObject({
			message: expect.stringContaining("Cannot find package 'some-dependency'"),
		});
		await expect(promise).rejects.toMatchObject({
			message: expect.not.stringContaining('npm install'),
		});
	});
});
