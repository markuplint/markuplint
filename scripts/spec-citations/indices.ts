import type { Page } from './extract.ts';
import type { Citation } from './types.ts';

/** The index of the HTML Standard: a summary of every element, attribute, event handler content attribute and event. */
export const INDEX_PAGE = 'https://html.spec.whatwg.org/multipage/indices.html';

/** This module, which is where the citations of `collectIndexCitations` are written. */
export const INDEX_SOURCE = 'scripts/spec-citations/indices.ts';

/**
 * The ids of the sections of the index (the `h3` headings under `h2#index`).
 *
 * Every one is watched as text, whatever cites it in the code: the section of elements is cited by two algorithms
 * of `@markuplint/ml-spec`, and a monitor that depended on those would stop watching it, without a report, the day
 * they are rewritten. The four tables that the data of `@markuplint/html-spec` has a counterpart for are also
 * compared with it (`index-tables.ts`); the others (the interfaces, the events, the HTTP headers, the MIME types)
 * are keyed by names that nothing in the data is, so a change to them shows as a text diff and nothing more.
 *
 * A section that the page gains and this list lacks is reported (`unlistedSections`), so a new table cannot go
 * unwatched. The first three hold the tables that are compared with the data.
 */
export const INDEX_SECTIONS = [
	'elements-3',
	'element-content-categories',
	'attributes-3',
	'element-interfaces',
	'all-interfaces',
	'events-2',
	'http-headers',
	'mime-types-2',
] as const;

/**
 * One citation for each section of the index, as the citations that nobody writes (`aria.ts`, `elements.ts`): the
 * rules of how a citation is written (`citations-policy.spec.ts`) do not apply to them. Each is put on the line of
 * its id in `moduleText`, the text of this module, so that a report points at where to look; 1 when the module does
 * not name it.
 */
export function collectIndexCitations(moduleText: string, file: string): Citation[] {
	const lines = moduleText.split(/\r?\n/);
	return INDEX_SECTIONS.map(id => {
		const at = lines.findIndex(line => line.trim() === `'${id}',`);
		return {
			file,
			line: at === -1 ? 1 : at + 1,
			url: `${INDEX_PAGE}#${id}`,
			page: INDEX_PAGE,
			fragment: id,
			textDirective: null,
			secno: null,
			quotes: [],
		};
	});
}

/** A section of the index that `INDEX_SECTIONS` lacks: its id, or `null` for a heading that has none, and its title. */
export type UnlistedSection = { readonly id: string | null; readonly title: string };

/**
 * The sections of the index that the page has and `INDEX_SECTIONS` lacks, or `null` when the page has no `#index`
 * heading (the index was moved or renamed, and nothing can be said about its sections). Read in document order, so
 * that a page that wraps its headings in containers is read the same: the `h3` headings after `h2#index`, up to the
 * next chapter heading. A heading with no id cannot be cited, so it is returned with a `null` id and its title rather
 * than skipped.
 */
export function unlistedSections(page: Page): UnlistedSection[] | null {
	const listed: ReadonlySet<string> = new Set(INDEX_SECTIONS);
	const unlisted: UnlistedSection[] = [];
	let inIndex = false;
	let found = false;
	for (const heading of page.headings) {
		if (!('tagName' in heading)) {
			continue;
		}
		const id = heading.attribs['id'];
		if (heading.tagName === 'h2') {
			inIndex = id === 'index';
			found ||= inIndex;
		} else if (heading.tagName === 'h3' && inIndex && (id === undefined || !listed.has(id))) {
			unlisted.push({ id: id ?? null, title: page.$(heading).text().replaceAll(/\s+/g, ' ').trim() });
		}
	}
	return found ? unlisted : null;
}
