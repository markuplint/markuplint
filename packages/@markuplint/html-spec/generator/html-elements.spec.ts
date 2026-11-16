import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { parse } from 'jsonc-parser';
import { afterEach, describe, test, expect, vi } from 'vitest';

import { getMDNElementURL, isWithoutMDNPage, obsoleteWithoutMDNPage } from './html-elements.ts';
import { getDefinitionCite } from './read-json.ts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('getMDNElementURL', () => {
	test('builds the MDN reference page of an element in each namespace', () => {
		expect(getMDNElementURL('a', 'HTML')).toBe(
			'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a',
		);
		expect(getMDNElementURL('h2', 'HTML')).toBe(
			'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements',
		);
		expect(getMDNElementURL('a', 'SVG')).toBe(
			'https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/a',
		);
		expect(getMDNElementURL('math', 'MathML')).toBe(
			'https://developer.mozilla.org/en-US/docs/Web/MathML/Reference/Element/math',
		);
	});
});

describe('getElements', () => {
	/**
	 * MDN answers 404 for every page, so what the output holds comes from the source file and from the generator
	 * itself, never from MDN.
	 */
	async function getElementsWithoutMDN() {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.resetModules();
		const { getElements: getFreshElements } = await import('./html-elements.ts');
		return getFreshElements(path.resolve(import.meta.dirname, '..', 'src', 'spec.a.jsonc'));
	}

	test('cites the section on the first line of the source file', async () => {
		const specs = await getElementsWithoutMDN();
		expect(specs.find(el => el.name === 'a')?.cite).toBe(
			'https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element',
		);
	});

	test('reads only the source files it is given', async () => {
		const specs = await getElementsWithoutMDN();
		expect(specs.find(el => el.name === 'acronym')).toBeUndefined();
	});

	test('writes neither the categories nor the tag omission of any element', async () => {
		const specs = await getElementsWithoutMDN();
		expect(specs.length).toBeGreaterThan(0);
		expect(specs.filter(el => 'categories' in el || 'omission' in el).map(el => el.name)).toStrictEqual([]);
	});
});

describe('isWithoutMDNPage', () => {
	test('lists only obsolete HTML elements', () => {
		const sourceDir = path.resolve(import.meta.dirname, '..', 'src');
		const obsolete = new Set(
			readdirSync(sourceDir)
				.filter(file => /^spec\.\w+\.jsonc$/.test(file))
				.filter(file => parse(readFileSync(path.join(sourceDir, file), 'utf8')).obsolete === true)
				.map(file => file.replace(/^spec\.(\w+)\.jsonc$/, '$1')),
		);
		expect([...obsoleteWithoutMDNPage].filter(name => !obsolete.has(name))).toStrictEqual([]);
	});

	test('fetches the page of the elements it is given only', async () => {
		// MDN answers 404 for every page: only an unexpected 404 is a failure.
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.resetModules();
		const { getElements: getFreshElements } = await import('./html-elements.ts');
		const { getFailedUrls } = await import('./fetch.ts');

		await getFreshElements(path.resolve(import.meta.dirname, '..', 'src', 'spec.a.jsonc'));

		const failed = getFailedUrls();
		expect(
			failed.filter(url => [...obsoleteWithoutMDNPage].some(name => url.endsWith(`/Elements/${name}`))),
		).toStrictEqual([]);
		expect(failed).not.toContain('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/acronym');
	});

	test('lets getElements fetch the page of such an element as expected not to exist', async () => {
		// MDN answers 404 for every page: only an unexpected 404 is a failure.
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.resetModules();
		const { getElements: getFreshElements } = await import('./html-elements.ts');
		const { getFailedUrls } = await import('./fetch.ts');

		await getFreshElements(path.resolve(import.meta.dirname, '..', 'src', 'spec.{a,acronym,spacer}.jsonc'));

		const failed = getFailedUrls();
		// `spacer` has no MDN page (expected), `acronym` has one (a 404 is a failure)
		expect(failed).not.toContain('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/spacer');
		expect(failed).toContain('https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/acronym');
	});

	test('is true for an obsolete HTML element that MDN does not document', () => {
		expect(isWithoutMDNPage('spacer', 'HTML')).toBe(true);
	});

	test('is false for an obsolete HTML element that MDN documents', () => {
		expect(isWithoutMDNPage('acronym', 'HTML')).toBe(false);
	});

	test('is false for an element of the same name in another namespace', () => {
		expect(isWithoutMDNPage('spacer', 'SVG')).toBe(false);
	});
});

describe('getDefinitionCite', () => {
	test('is the URL on the first line of the source file, which cites the definition of the element', () => {
		const source = [
			'// https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element',
			'// https://www.w3.org/TR/html-aria/#el-a',
			'{}',
		].join('\n');
		expect(getDefinitionCite(source, 'spec.a.jsonc')).toBe(
			'https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element',
		);
	});

	test('reads a file that starts with a byte order mark', () => {
		expect(getDefinitionCite('\uFEFF// https://example.com/#a\n{}', 'spec.x.jsonc')).toBe('https://example.com/#a');
	});

	test('reads a URL of http, with no space after the slashes and with trailing spaces', () => {
		expect(getDefinitionCite('//http://example.com/#a  \n{}', 'spec.x.jsonc')).toBe('http://example.com/#a');
	});

	test('reads a file with a byte order mark and CRLF line breaks', () => {
		expect(getDefinitionCite('\uFEFF// https://example.com/#a\r\n{}\r\n', 'spec.x.jsonc')).toBe(
			'https://example.com/#a',
		);
	});

	test('reads a file with CRLF line breaks', () => {
		const source = '// https://svgwg.org/svg2-draft/shapes.html#RectElement\r\n{}\r\n';
		expect(getDefinitionCite(source, 'spec.svg_rect.jsonc')).toBe(
			'https://svgwg.org/svg2-draft/shapes.html#RectElement',
		);
	});

	test.each([
		['a file that does not start with a comment', '{}\n// https://example.com/'],
		['a first line that is a comment without a URL', '// the a element\n{}'],
		['a first line that has more than the URL', '// see https://example.com/ for details\n{}'],
		['an empty file', ''],
	])('throws for %s, naming the file', (_name, source) => {
		expect(() => getDefinitionCite(source, 'spec.x.jsonc')).toThrow(/spec\.x\.jsonc/);
	});
});

describe('getElements: obsolete elements', () => {
	test('reads an obsolete element from its source file, which cites its entry of the list of non-conforming features', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('', { status: 404 }))),
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.resetModules();
		const { getElements: getFreshElements } = await import('./html-elements.ts');
		// the glob takes forward slashes only
		const pattern = path.resolve(import.meta.dirname, '..', 'src', 'spec.{a,acronym}.jsonc').replaceAll('\\', '/');
		const specs = await getFreshElements(pattern);
		const acronym = specs.find(el => el.name === 'acronym');
		expect(acronym?.obsolete).toBe(true);
		expect(acronym?.cite).toBe('https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features');
	});
});
