import type { CreateTestOptions } from '@markuplint/ml-core';

import { createTestDocument } from '@markuplint/ml-core';
import { describe, test, expect } from 'vitest';

import * as jsxParser from '@markuplint/jsx-parser';

import { hasSizesAuto } from './parse-srcset.js';
import { allowsAutoSizes, isAutoSizes, isLazyLoading } from './sibling-helpers.js';

describe('hasSizesAuto', () => {
	test.each([
		['auto', true],
		['AUTO', true],
		['auto,', true],
		['auto, 100vw', true],
		['Auto,100vw', true],
		['auto 100vw', false],
		[' auto', false],
		['auto ', false],
		['auto\t', false],
		['100vw, auto', false],
		['', false],
	])('[srcset-sizes-constraint-valid-001] hasSizesAuto(%j) is %s', (value, expected) => {
		expect(hasSizesAuto(value)).toBe(expected);
	});
});

/**
 * Evaluate a helper against each `<img>` of a document.
 */
const run = (
	html: string,
	pick: (img: Parameters<typeof allowsAutoSizes>[0]) => boolean | null,
	options?: CreateTestOptions,
) => {
	const document = createTestDocument(html, options);
	const seen: (boolean | null)[] = [];
	for (const node of document.nodeList) {
		if (node.is(node.ELEMENT_NODE) && node.localName === 'img') {
			seen.push(pick(node));
		}
	}
	return seen;
};

describe('isLazyLoading / isAutoSizes / allowsAutoSizes', () => {
	test.each([
		['<img src="a" loading="lazy">', true],
		['<img src="a" loading="LAZY">', true],
		['<img src="a" loading=" lazy">', false],
		['<img src="a" loading="eager">', false],
		['<img src="a">', false],
	])('[srcset-sizes-constraint-valid-002] isLazyLoading(%s) is %s', (html, expected) => {
		expect(run(html, isLazyLoading)).toStrictEqual([expected]);
	});

	test.each([
		['<img src="a" sizes="auto">', true],
		['<img src="a" sizes="auto, 100vw">', true],
		['<img src="a" sizes="auto 100vw">', false],
		['<img src="a">', false],
	])('[srcset-sizes-constraint-valid-003] isAutoSizes(%s) is %s', (html, expected) => {
		expect(run(html, isAutoSizes)).toStrictEqual([expected]);
	});

	test.each([
		['<img src="a" loading="lazy" sizes="auto">', true],
		['<img src="a" loading="lazy" sizes="100vw">', false],
		['<img src="a" loading="eager" sizes="auto">', false],
		['<img src="a" sizes="auto">', false],
	])('[srcset-sizes-constraint-valid-004] allowsAutoSizes(%s) is %s', (html, expected) => {
		expect(run(html, allowsAutoSizes)).toStrictEqual([expected]);
	});

	test('[srcset-sizes-constraint-valid-005] spread attributes make loading and sizes unknown, unless the attribute is written', () => {
		const jsx = { parser: jsxParser };
		expect(run('<img {...p} />', isLazyLoading, jsx)).toStrictEqual([null]);
		expect(run('<img {...p} />', isAutoSizes, jsx)).toStrictEqual([null]);
		expect(run('<img {...p} loading="eager" />', isLazyLoading, jsx)).toStrictEqual([false]);
		expect(run('<img {...p} loading="lazy" />', allowsAutoSizes, jsx)).toStrictEqual([null]);
		expect(run('<img {...p} loading="eager" />', allowsAutoSizes, jsx)).toStrictEqual([false]);
	});
});
