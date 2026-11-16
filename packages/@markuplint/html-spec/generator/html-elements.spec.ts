import path from 'node:path';

import { afterEach, describe, test, expect, vi } from 'vitest';

import { getElements } from './html-elements.ts';
import { getDefinitionCite } from './read-json.ts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** The glob takes forward slashes only. */
function getElementsOf(fileName: string) {
	return getElements(path.resolve(import.meta.dirname, '..', 'src', fileName).replaceAll('\\', '/'));
}

describe('getElements', () => {
	test('cites the section on the first line of the source file', async () => {
		const specs = await getElementsOf('spec.a.jsonc');
		expect(specs.find(el => el.name === 'a')?.cite).toBe(
			'https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element',
		);
	});

	test('reads only the source files it is given', async () => {
		const specs = await getElementsOf('spec.a.jsonc');
		expect(specs.find(el => el.name === 'acronym')).toBeUndefined();
	});

	test('writes neither the categories nor the tag omission of any element', async () => {
		const specs = await getElementsOf('spec.a.jsonc');
		expect(specs.length).toBeGreaterThan(0);
		expect(specs.filter(el => 'categories' in el || 'omission' in el).map(el => el.name)).toStrictEqual([]);
	});
});

describe('getElements: nothing is fetched', () => {
	test('reads the source files only, with no request for any element of any kind', async () => {
		const fetchMock = vi.fn(() => Promise.resolve(new Response('', { status: 200 })));
		vi.stubGlobal('fetch', fetchMock);

		const specs = await getElementsOf('spec.{a,acronym,spacer}.jsonc');

		expect(specs.map(el => el.name)).toStrictEqual(['a', 'acronym', 'spacer']);
		expect(fetchMock).not.toHaveBeenCalled();
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
		const specs = await getElementsOf('spec.{a,acronym}.jsonc');
		const acronym = specs.find(el => el.name === 'acronym');
		expect(acronym?.obsolete).toBe(true);
		expect(acronym?.cite).toBe('https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features');
	});
});
