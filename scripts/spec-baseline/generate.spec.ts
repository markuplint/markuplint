import htmlSpec from '@markuplint/html-spec';
import { mlTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import { generateDocument } from './generate.ts';

const spec = htmlSpec as unknown as Parameters<typeof generateDocument>[0];

/** The elements that have no end tag. */
const VOID = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'source',
	'track',
	'wbr',
]);

const TAG = /<(\/?)([a-z][a-z\d-]*)(?:[\s/][^>]*)?>/g;

function countElements(html: string): number {
	return [...html.matchAll(TAG)].filter(match => match[1] === '').length;
}

/** The deepest nesting of elements in a document that writes every end tag. */
function deepestNesting(html: string): number {
	let deepest = 0;
	let depth = 0;
	for (const match of html.matchAll(TAG)) {
		const [, closing, name] = match;
		if (VOID.has(name ?? '')) {
			continue;
		}
		depth += closing === '/' ? -1 : 1;
		deepest = Math.max(deepest, depth);
	}
	return deepest;
}

describe('generateDocument', () => {
	test('gives the same document for the same seed and another for another seed', () => {
		const a = generateDocument(spec, { seed: 1, elements: 200 });
		expect(generateDocument(spec, { seed: 1, elements: 200 })).toBe(a);
		expect(generateDocument(spec, { seed: 2, elements: 200 })).not.toBe(a);
	});

	test('grows with the budget of elements', () => {
		const small = countElements(generateDocument(spec, { seed: 1, elements: 100 }));
		const large = countElements(generateDocument(spec, { seed: 1, elements: 1000 }));
		expect(large).toBeGreaterThan(small * 4);
	});

	test('stays near the budget, apart from what a content model requires', () => {
		const count = countElements(generateDocument(spec, { seed: 1, elements: 500 }));
		expect(count).toBeGreaterThanOrEqual(500);
		expect(count).toBeLessThan(700);
	});

	test('nests deeper when it is asked for more depth', () => {
		const shallow = deepestNesting(generateDocument(spec, { seed: 1, elements: 400, depth: 4 }));
		const deep = deepestNesting(generateDocument(spec, { seed: 1, elements: 400, depth: 20 }));
		expect(deep).toBeGreaterThan(shallow);
		expect(deep).toBeGreaterThanOrEqual(10);
	});

	test.each([1, 2, 3, 4, 5, 6, 7, 8])(
		'has no violation of the content models of its elements (seed %i)',
		async seed => {
			const html = generateDocument(spec, { seed, elements: 400 });
			const { violations } = await mlTest(html, { rules: { 'permitted-contents': true } });
			expect(violations).toStrictEqual([]);
		},
	);
});
