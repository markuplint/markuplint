import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import { createRule } from '@markuplint/ml-core';

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
 * Evaluate a helper against the first `<img>` of a document through a throwaway rule,
 * because an `Element` only exists inside a rule's `verify`.
 */
const run = async (
	html: string,
	pick: (img: Parameters<typeof allowsAutoSizes>[0]) => boolean | null,
	options?: Parameters<typeof mlRuleTest<boolean, undefined>>[2],
) => {
	const seen: (boolean | null)[] = [];
	const probe = createRule<boolean>({
		meta: { category: 'a11y' },
		async verify({ document }) {
			await document.walkOn('Element', el => {
				if (el.localName === 'img') {
					seen.push(pick(el));
				}
			});
		},
	});
	await mlRuleTest(probe, html, options);
	return seen;
};

describe('isLazyLoading / isAutoSizes / allowsAutoSizes', () => {
	test.each([
		['<img src="a" loading="lazy">', true],
		['<img src="a" loading="LAZY">', true],
		['<img src="a" loading=" lazy">', false],
		['<img src="a" loading="eager">', false],
		['<img src="a">', false],
	])('[srcset-sizes-constraint-valid-002] isLazyLoading(%s) is %s', async (html, expected) => {
		expect(await run(html, isLazyLoading)).toStrictEqual([expected]);
	});

	test.each([
		['<img src="a" sizes="auto">', true],
		['<img src="a" sizes="auto, 100vw">', true],
		['<img src="a" sizes="auto 100vw">', false],
		['<img src="a">', false],
	])('[srcset-sizes-constraint-valid-003] isAutoSizes(%s) is %s', async (html, expected) => {
		expect(await run(html, isAutoSizes)).toStrictEqual([expected]);
	});

	test.each([
		['<img src="a" loading="lazy" sizes="auto">', true],
		['<img src="a" loading="lazy" sizes="100vw">', false],
		['<img src="a" loading="eager" sizes="auto">', false],
		['<img src="a" sizes="auto">', false],
	])('[srcset-sizes-constraint-valid-004] allowsAutoSizes(%s) is %s', async (html, expected) => {
		expect(await run(html, allowsAutoSizes)).toStrictEqual([expected]);
	});

	test('[srcset-sizes-constraint-valid-005] spread attributes make loading and sizes unknown, unless the attribute is written', async () => {
		const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };
		expect(await run('<img {...p} />', isLazyLoading, jsx)).toStrictEqual([null]);
		expect(await run('<img {...p} />', isAutoSizes, jsx)).toStrictEqual([null]);
		expect(await run('<img {...p} loading="eager" />', isLazyLoading, jsx)).toStrictEqual([false]);
		expect(await run('<img {...p} loading="lazy" />', allowsAutoSizes, jsx)).toStrictEqual([null]);
		expect(await run('<img {...p} loading="eager" />', allowsAutoSizes, jsx)).toStrictEqual([false]);
	});
});
