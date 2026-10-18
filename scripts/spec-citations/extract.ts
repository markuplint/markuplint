import type { CheerioAPI } from 'cheerio';

import type { Section } from './types.ts';

import * as cheerio from 'cheerio';

import { normalizeSpecText } from './normalize.ts';

type Cheerio = ReturnType<CheerioAPI>;
type El = Cheerio[number];

export type Page = {
	readonly $: CheerioAPI;
	readonly ids: ReadonlyMap<string, El>;
	/** Headings in document order. */
	readonly headings: readonly El[];
	/** Document-order index of every element, to find the heading before an element. */
	readonly order: ReadonlyMap<El, number>;
	/**
	 * The page is a ReSpec source that the browser would still render:
	 * ids such as `dfn-naming-prohibited` do not exist in its markup yet, so
	 * an anchor check against it would report phantom failures. It is told
	 * from a rendered page by the respec script still being there and no
	 * heading having been numbered: rendering removes the one and adds the other.
	 */
	readonly unprocessed: boolean;
};

/** Annotations the spec sites inject and numbering that shifts when a section is inserted. */
const NOISE = '.mdn-anno, .self-link, .secno, script, style, template';
const HEADING = /^h[1-6]$/;
const BLOCK = 'p, li, dd, dt, tr, pre, table, blockquote, section';
/** Elements that end a line of text; a space is put around them so words from adjacent blocks do not fuse. */
const BREAKING = 'p, li, dd, dt, tr, td, th, div, section, h1, h2, h3, h4, h5, h6, ul, ol, pre, table, blockquote, br';

export function parsePage(html: string): Page {
	const $ = cheerio.load(html);
	const ids = new Map<string, El>();
	const order = new Map<El, number>();
	const headings: El[] = [];
	let index = 0;
	$('*').each((_, el) => {
		order.set(el, index++);
		const id = el.attribs['id'];
		if (id !== undefined && !ids.has(id)) {
			ids.set(id, el);
		}
		if (HEADING.test(el.tagName)) {
			headings.push(el);
		}
	});
	// An anchor named by `name` is a target too, but only when no element has that id (the HTML fragment-navigation rule); old W3C Recommendations use nothing else.
	$('a[name]').each((_, el) => {
		const name = el.attribs['name'];
		if (name !== undefined && !ids.has(name)) {
			ids.set(name, el);
		}
	});
	return { $, ids, headings, order, unprocessed: $('script[src*="respec"]').length > 0 && $('.secno').length === 0 };
}

const pageTexts = new WeakMap<Page, string>();

/** The text of the whole page, where a `:~:text=` directive is searched (a text fragment is not limited to its fragment's section). */
export function pageText(page: Page): string {
	let text = pageTexts.get(page);
	if (text === undefined) {
		const body = page.$('body').clone();
		body.find('script, style, template').remove();
		text = plainText(page.$, body);
		pageTexts.set(page, text);
	}
	return text;
}

function plainText($: CheerioAPI, copy: Cheerio): string {
	copy.find(BREAKING).each((_, el) => {
		$(el).before(' ').after(' ');
	});
	return normalizeSpecText(copy.text());
}

function textOf($: CheerioAPI, nodes: readonly El[]): string {
	return normalizeSpecText(
		nodes
			.map(node => {
				if ($(node).is(NOISE)) {
					return '';
				}
				const copy = $(node).clone();
				copy.find(NOISE).remove();
				return plainText($, copy);
			})
			.join(' '),
	);
}

function secnoOf($: CheerioAPI, heading: El): string | null {
	const secno = $(heading).find('.secno').first().text().trim().replace(/\.$/, '');
	return secno === '' ? null : secno;
}

/** The `section` a heading titles, when the page nests sections (ReSpec) rather than listing headings flat. */
function sectionTitledBy($: CheerioAPI, heading: El): El | null {
	const parent = $(heading).parent();
	const holder = parent.is('.header-wrapper') ? parent.parent() : parent;
	return holder.is('section') ? (holder[0] ?? null) : null;
}

function ownProse($: CheerioAPI, section: El): string {
	const copy = $(section).clone();
	copy.find('section').remove();
	copy.find(NOISE).remove();
	return plainText($, copy);
}

function levelOf(heading: El): number {
	return Number(heading.tagName.slice(1));
}

function extractHeading($: CheerioAPI, heading: El): { unit: string; scope: string; secno: string | null } {
	const secno = secnoOf($, heading);
	const section = sectionTitledBy($, heading);
	if (section !== null) {
		return { unit: ownProse($, section), scope: textOf($, [section]), secno };
	}
	const unit: El[] = [heading];
	const scope: El[] = [heading];
	let inUnit = true;
	for (const sibling of $(heading).nextAll().toArray()) {
		if (HEADING.test(sibling.tagName)) {
			inUnit = false;
			if (levelOf(sibling) <= levelOf(heading)) {
				break;
			}
		}
		if (inUnit) {
			unit.push(sibling);
		}
		scope.push(sibling);
	}
	return { unit: textOf($, unit), scope: textOf($, scope), secno };
}

function headingBefore(page: Page, el: El): El | null {
	const at = page.order.get(el) ?? 0;
	let found: El | null = null;
	for (const heading of page.headings) {
		if ((page.order.get(heading) ?? 0) > at) {
			break;
		}
		found = heading;
	}
	return found;
}

/**
 * Extracts the part of a page a citation's fragment stands for.
 *
 * The hash is taken over the smallest unit that holds the fragment (a
 * paragraph, an algorithm, a heading's own prose) so that an edit elsewhere in
 * a large section does not read as a change to the cited passage. Quotes are
 * looked up in the larger scope, because a README often cites a section's
 * heading while quoting a sentence from a subsection under it.
 */
export function extractSection(page: Page, fragment: string): Section {
	const el = page.ids.get(fragment);
	if (el === undefined) {
		return { status: 'missing' };
	}
	const { $ } = page;

	// A heading often carries empty aliases (`<span id="old-name"></span>`) so that an old link keeps working.
	const enclosingHeading = $(el).closest('h1, h2, h3, h4, h5, h6')[0];
	if (enclosingHeading !== undefined) {
		return { status: 'found', ...extractHeading($, enclosingHeading) };
	}
	if (el.tagName === 'section') {
		const heading = $(el).find('h1, h2, h3, h4, h5, h6').first()[0];
		return {
			status: 'found',
			unit: ownProse($, el),
			scope: textOf($, [el]),
			secno: heading === undefined ? null : secnoOf($, heading),
		};
	}

	const algorithm = $(el).closest('div[data-algorithm]')[0];
	const block = algorithm ?? $(el).closest(BLOCK)[0] ?? el;
	const heading = headingBefore(page, el);
	const context = heading === null ? null : extractHeading($, heading);
	const unit = block.tagName === 'section' ? ownProse($, block) : textOf($, [block]);
	return { status: 'found', unit, scope: context?.scope ?? unit, secno: context?.secno ?? null };
}
