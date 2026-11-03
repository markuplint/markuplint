import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test, vi } from 'vitest';

import { disambiguatePretendersForFile, resolvePretenders } from './resolve-pretenders.js';

/** The parsers that `@markuplint/pretenders` loads, which the message has to name: they are its optional peers. */
const PARSERS = Object.keys(
	(
		JSON.parse(
			readFileSync(path.resolve(import.meta.dirname, '..', '..', 'pretenders', 'package.json'), 'utf8'),
		) as { peerDependencies: Record<string, string> }
	).peerDependencies,
);

/**
 * `@markuplint/pretenders` is made to be missing, as Node reports a package that is not installed: the code
 * `ERR_MODULE_NOT_FOUND`, and a message that names the package. Vitest wraps an error thrown by a mock
 * factory in its own, which has no `code`, so every export throws it instead.
 */
vi.mock('@markuplint/pretenders', () => {
	const notFound = () =>
		Object.assign(
			new Error(
				"Cannot find package '@markuplint/pretenders' imported from /project/node_modules/@markuplint/file-resolver/lib/resolve-pretenders.js",
			),
			{ code: 'ERR_MODULE_NOT_FOUND' },
		);
	return {
		get scan() {
			throw notFound();
		},
		get autoScan() {
			throw notFound();
		},
		get disambiguatePretenders() {
			throw notFound();
		},
		get clearPretenderCaches() {
			throw notFound();
		},
	};
});

const INSTALL = 'npm install --save-dev @markuplint/pretenders';

describe('resolution that needs @markuplint/pretenders when it is not installed', () => {
	test('scan fails with how to install it, naming the option', async () => {
		await expect(resolvePretenders({ scan: [{ files: './nothing/*.vue' }] })).rejects.toMatchObject({
			message: expect.stringContaining('"pretenders.scan"'),
			cause: { code: 'ERR_MODULE_NOT_FOUND' },
		});
		await expect(resolvePretenders({ scan: [{ files: './nothing/*.vue' }] })).rejects.toThrow(INSTALL);
	});

	test('auto fails with how to install it, naming the option', async () => {
		const context = { filePath: '/project/page.tsx', sourceCode: '' };

		await expect(resolvePretenders({ auto: true }, context)).rejects.toMatchObject({
			message: expect.stringContaining('"pretenders.auto"'),
			cause: { code: 'ERR_MODULE_NOT_FOUND' },
		});
		await expect(resolvePretenders({ auto: true }, context)).rejects.toThrow(INSTALL);
	});

	test('disambiguation of a pretender that has a filePath fails with how to install it', async () => {
		const pretenders = [{ selector: 'Button', as: 'button', filePath: '/project/Button.tsx:1:1' }];

		await expect(disambiguatePretendersForFile('/project/page.tsx', '', pretenders)).rejects.toMatchObject({
			message: expect.stringContaining('`filePath`'),
			cause: { code: 'ERR_MODULE_NOT_FOUND' },
		});
		await expect(disambiguatePretendersForFile('/project/page.tsx', '', pretenders)).rejects.toThrow(INSTALL);
	});

	test.each(PARSERS)('names %s, a parser package that @markuplint/pretenders takes as a peer', async parser => {
		await expect(resolvePretenders({ scan: [{ files: './nothing/*.vue' }] })).rejects.toThrow(parser);
	});

	test('a configuration that does not need it resolves without it', async () => {
		await expect(resolvePretenders({ data: [{ selector: 'Button', as: 'button' }] })).resolves.toStrictEqual([
			{ selector: 'Button', as: 'button' },
		]);
		await expect(
			disambiguatePretendersForFile('/project/page.tsx', '', [{ selector: 'Button', as: 'button' }]),
		).resolves.toStrictEqual([{ selector: 'Button', as: 'button' }]);
	});
});
