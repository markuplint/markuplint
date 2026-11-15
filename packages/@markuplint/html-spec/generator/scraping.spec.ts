import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { fetchObsoleteElements } from './scraping.ts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const OBSOLETE = 'https://html.spec.whatwg.org/multipage/obsolete.html';

describe('fetchHTMLElement', () => {
	const page = `<main id="content">
		<div class="reference-layout__header"><div class="content-section">The element.</div></div>
		<table class="properties"><tbody>
			<tr><th>Content categories</th><td><a href="#">Flow content</a>, phrasing content.</td></tr>
			<tr><th>Tag omission</th><td>None; both the starting and ending tag are mandatory.</td></tr>
		</tbody></table>
	</main>`;

	test('reads the description of the page, but neither the categories, the tag omission nor a reference', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response(page, { status: 200 }))),
		);
		vi.resetModules();
		const { fetchHTMLElement } = await import('./scraping.ts');

		const spec = await fetchHTMLElement('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/b');

		expect(spec.description).toBe('The element.');
		expect(Object.keys(spec).filter(key => ['categories', 'omission', 'cite'].includes(key))).toStrictEqual([]);
	});
});

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
