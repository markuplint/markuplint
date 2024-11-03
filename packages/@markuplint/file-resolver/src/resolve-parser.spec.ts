import { test, expect, vi } from 'vitest';

import { getFile } from './ml-file/index.js';
import { resolveParser } from './resolve-parser.js';
import { Parser } from '@markuplint/parser-utils';

vi.mock('markuplint-angular-parser', () => {
	return {
		default: {
			parser: new (class extends Parser {})(),
		},
	};
});

test('resolveParser', async () => {
	// @ts-ignore
	const mod = await import('markuplint-angular-parser');
	const { parser, parserModName, matched } = await resolveParser(getFile('angular.html'), {
		'.html$': 'markuplint-angular-parser',
	});
	expect(parser.parse).toStrictEqual(mod.default.parser.parse);
	expect(parserModName).toBe('markuplint-angular-parser');
	expect(matched).toBe(true);
});
