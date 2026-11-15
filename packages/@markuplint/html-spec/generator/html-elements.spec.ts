import path from 'node:path';

import { afterEach, describe, test, expect, vi } from 'vitest';

import {
	getMDNElementURL,
	isWithoutMDNPage,
	mergeMDNAttributes,
	obsoleteList,
	obsoleteWithoutMDNPage,
} from './html-elements.ts';
import { getDefinitionCite } from './read-json.ts';
import { STATUS_FLAGS } from './utils.ts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('mergeMDNAttributes', () => {
	const mdn = {
		href: { name: 'href', type: 'Any' as const, description: 'MDN href', deprecated: true as const },
		ping: { name: 'ping', type: 'Any' as const, description: 'MDN ping' },
	};

	test('does not take an attribute that only MDN has and that has no status flag', () => {
		expect(mergeMDNAttributes({}, { ping: mdn.ping })).toStrictEqual({});
	});

	test('does not take an attribute that only MDN has and whose status flags are all false', () => {
		const flags = { experimental: false, obsolete: false, deprecated: false, nonStandard: false };
		expect(mergeMDNAttributes({}, { ping: { ...mdn.ping, ...flags } as never })).toStrictEqual({});
	});

	test('takes an attribute that only MDN has when it has a status flag, with its description and flags', () => {
		expect(mergeMDNAttributes({}, { href: mdn.href })).toStrictEqual({
			href: {
				description: 'MDN href',
				experimental: undefined,
				obsolete: undefined,
				deprecated: true,
				nonStandard: undefined,
			},
		});
	});

	test('writes a status flag that is false on the MDN side as no flag at all', () => {
		const mdnAttr = { name: 'x', type: 'Any' as const, experimental: true as const, nonStandard: false };
		const merged = mergeMDNAttributes({}, { x: mdnAttr as never });
		expect(merged.x?.experimental).toBe(true);
		expect(merged.x?.nonStandard).toBeUndefined();
		expect(JSON.stringify(merged.x)).not.toContain('nonStandard');
	});

	test.each(STATUS_FLAGS)('takes an attribute that only MDN has and that is flagged %s', flag => {
		const merged = mergeMDNAttributes({}, { flagged: { name: 'flagged', type: 'Any', [flag]: true } });
		expect(merged.flagged?.[flag]).toBe(true);
	});

	test('lets a manual entry win over the MDN fields it also has', () => {
		expect(mergeMDNAttributes({ href: { type: 'URL', deprecated: false } }, mdn)).toStrictEqual({
			href: {
				description: 'MDN href',
				experimental: undefined,
				obsolete: undefined,
				deprecated: false,
				nonStandard: undefined,
				type: 'URL',
			},
		});
	});

	test('merges only the MDN fields of the same attribute into a manual entry that has "name"', () => {
		const merged = mergeMDNAttributes({ href: { name: 'href', type: 'URL' } }, mdn);
		expect(merged).toStrictEqual({
			href: {
				name: 'href',
				description: 'MDN href',
				experimental: undefined,
				obsolete: undefined,
				deprecated: true,
				nonStandard: undefined,
				type: 'URL',
			},
		});
		expect(Object.keys(merged.href!)[0]).toBe('name');
	});
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

	test('cites the list of non-conforming features for an element that has no source file', async () => {
		const specs = await getElementsWithoutMDN();
		expect(specs.find(el => el.name === 'acronym')?.cite).toMatch(
			/^https:\/\/html\.spec\.whatwg\.org\/multipage\/obsolete\.html#/,
		);
	});

	test('writes neither the categories nor the tag omission of any element', async () => {
		const specs = await getElementsWithoutMDN();
		expect(specs.length).toBeGreaterThan(1);
		expect(specs.filter(el => 'categories' in el || 'omission' in el).map(el => el.name)).toStrictEqual([]);
	});
});

describe('isWithoutMDNPage', () => {
	test('lists only obsolete HTML elements', () => {
		expect([...obsoleteWithoutMDNPage].filter(name => !obsoleteList.includes(name))).toStrictEqual([]);
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

		await getFreshElements(path.resolve(import.meta.dirname, '..', 'src', 'spec.a.jsonc'));

		const failed = getFailedUrls();
		expect(
			failed.filter(url => [...obsoleteWithoutMDNPage].some(name => url.endsWith(`/Elements/${name}`))),
		).toStrictEqual([]);
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
