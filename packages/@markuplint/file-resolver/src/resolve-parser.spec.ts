import { test, expect, vi } from 'vitest';

import { getFile } from './ml-file/index.js';
import { resolveParser } from './resolve-parser.js';

vi.mock('markuplint-angular-parser', () => {
	return {
		default: {
			parse: vi.fn(),
		},
	};
});

test('resolveParser', async () => {
	// @ts-expect-error
	// eslint-disable-next-line import-x/no-unresolved
	const mod = await import('markuplint-angular-parser');
	const { parser, parserModName, matched } = await resolveParser(getFile('angular.html'), {
		'.html$': 'markuplint-angular-parser',
	});
	expect(parser.parse).toStrictEqual(mod.default.parse);
	expect(parserModName).toBe('markuplint-angular-parser');
	expect(matched).toBe(true);
});
