import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { describe, expect, test } from 'vitest';

import { fetchObsoleteElements } from './scraping.ts';

const OBSOLETE = 'https://html.spec.whatwg.org/multipage/obsolete.html';

describe('fetchObsoleteElements', () => {
	test('cites each obsolete element at its own term in the list of non-conforming features', () => {
		const specs = fetchObsoleteElements(['xmp', 'acronym'], []);
		expect(specs.map(s => [s.name, s.cite])).toStrictEqual([
			['xmp', `${OBSOLETE}#xmp`],
			['acronym', `${OBSOLETE}#acronym`],
		]);
	});

	test('cites the whole list for an element that the page names without a term of its own', () => {
		const specs = fetchObsoleteElements(['xmp', 'acronym'], [], name => name === 'xmp');
		expect(specs.map(s => s.cite)).toStrictEqual([`${OBSOLETE}#xmp`, `${OBSOLETE}#non-conforming-features`]);
	});

	test('leaves out an element that is already in the specs', () => {
		const existing = [{ name: 'xmp' }] as unknown as readonly ExtendedElementSpec[];
		expect(fetchObsoleteElements(['xmp', 'acronym'], existing).map(s => s.name)).toStrictEqual(['acronym']);
	});
});
