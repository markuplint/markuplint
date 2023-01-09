import { jest } from '@jest/globals';

import { getFile } from '../lib/ml-file/index.mjs';
import { resolveParser } from '../lib/resolve-parser.mjs';

jest.unstable_mockModule('markuplint-angular-parser', () => ({
	default: {
		parse: jest.fn(),
	},
}));

test('resolveParser', async () => {
	const { parser, parserModName, matched } = await resolveParser(getFile('angular.html'), {
		'.html$': 'markuplint-angular-parser',
	});
	expect(parser).toStrictEqual(
		// eslint-disable-next-line import/no-unresolved -- fake module
		await import('markuplint-angular-parser'),
	);
	expect(parserModName).toBe('markuplint-angular-parser');
	expect(matched).toBe(true);
});
