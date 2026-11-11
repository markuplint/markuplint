import path from 'node:path';

import { afterEach, describe, test, expect, vi } from 'vitest';

import {
	getMDNElementURL,
	isWithoutMDNPage,
	mergeMDNAttributes,
	obsoleteList,
	obsoleteWithoutMDNPage,
} from './html-elements.ts';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('mergeMDNAttributes', () => {
	const mdn = {
		href: { name: 'href', type: 'Any' as const, description: 'MDN href', deprecated: true as const },
		ping: { name: 'ping', type: 'Any' as const, description: 'MDN ping' },
	};

	test('takes the description and the status flags of an attribute that only MDN has', () => {
		expect(mergeMDNAttributes({}, { ping: mdn.ping })).toStrictEqual({
			ping: {
				description: 'MDN ping',
				experimental: undefined,
				obsolete: undefined,
				deprecated: undefined,
				nonStandard: undefined,
			},
		});
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
			ping: {
				description: 'MDN ping',
				experimental: undefined,
				obsolete: undefined,
				deprecated: undefined,
				nonStandard: undefined,
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
			ping: {
				description: 'MDN ping',
				experimental: undefined,
				obsolete: undefined,
				deprecated: undefined,
				nonStandard: undefined,
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
