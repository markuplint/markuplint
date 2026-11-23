import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { parsePage } from './extract.ts';
import { collectIndexCitations, INDEX_PAGE, INDEX_SECTIONS, INDEX_SOURCE, unlistedSections } from './indices.ts';

const SOURCE = readFileSync(new URL('indices.ts', import.meta.url), 'utf8');

const page = (body: string) => parsePage(`<!doctype html><html><body>${body}</body></html>`);
const sections = (ids: readonly string[]) => ids.map(id => `<h3 id="${id}">Section</h3><p>text</p>`).join('');

describe('the citations that stand for the sections of the index', () => {
	test('[indices-001] has one citation for each section, with no fragment but its id', () => {
		const citations = collectIndexCitations(SOURCE, INDEX_SOURCE);
		expect(citations.map(c => c.fragment)).toStrictEqual([...INDEX_SECTIONS]);
		expect(citations[0]).toMatchObject({
			file: INDEX_SOURCE,
			url: `${INDEX_PAGE}#${INDEX_SECTIONS[0]}`,
			page: INDEX_PAGE,
			textDirective: null,
			secno: null,
			quotes: [],
		});
	});

	test('[indices-002] puts each citation on the line of its own id in the module', () => {
		const lines = SOURCE.split(/\r?\n/);
		for (const citation of collectIndexCitations(SOURCE, INDEX_SOURCE)) {
			expect(lines[citation.line - 1]?.trim()).toBe(`'${citation.fragment}',`);
		}
	});

	test('[indices-003] falls back to line 1 for a module that does not name the id', () => {
		const citations = collectIndexCitations('nothing here', INDEX_SOURCE);
		expect(citations.map(c => c.line)).toStrictEqual(INDEX_SECTIONS.map(() => 1));
	});

	test('[indices-004] names every section of the index that the page has and the list lacks', () => {
		const result = unlistedSections(page(`<h2 id="index">Index</h2>${sections([...INDEX_SECTIONS, 'new-table'])}`));
		expect(result).toStrictEqual([{ id: 'new-table', title: 'Section' }]);
	});

	test('[indices-005] reports nothing when the page has exactly the listed sections', () => {
		expect(unlistedSections(page(`<h2 id="index">Index</h2>${sections(INDEX_SECTIONS)}`))).toStrictEqual([]);
	});

	test('[indices-006] stops at the next chapter', () => {
		const result = unlistedSections(
			page(`<h2 id="index">Index</h2>${sections(INDEX_SECTIONS)}<h2 id="next">Next</h2>${sections(['other'])}`),
		);
		expect(result).toStrictEqual([]);
	});

	test('[indices-007] finds the sections when the page wraps them in a container', () => {
		const result = unlistedSections(
			page(`<div><h2 id="index">Index</h2></div><section>${sections(['new-table'])}</section>`),
		);
		expect(result).toStrictEqual([{ id: 'new-table', title: 'Section' }]);
	});

	test('[indices-008] is null for a page that has no index heading', () => {
		expect(unlistedSections(page(sections(['new-table'])))).toBeNull();
	});

	test('[indices-009] names a section that has no id, which cannot be cited, by its title', () => {
		const result = unlistedSections(
			page(`<h2 id="index">Index</h2>${sections(INDEX_SECTIONS)}<h3>  A\n   new   table </h3>`),
		);
		expect(result).toStrictEqual([{ id: null, title: 'A new table' }]);
	});
});
