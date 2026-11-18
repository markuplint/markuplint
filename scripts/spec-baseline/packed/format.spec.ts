import { describe, expect, test } from 'vitest';

import { VARIANTS, variantName, variantOf, variantWord, type Variant } from './format.ts';

const PLAIN: Variant = { columns: false, index: 'pow2', hash: 'murmur3' };

const namesOf = (choose: (variant: Variant) => boolean | undefined): string[] =>
	VARIANTS.filter(variant => choose(variant)).map(variant => variantName(variant));

/** The candidate in columns with the nodes grouped and the empty slot 0, with the choices of the strings and of the indexes. */
const smaller = (choices: { narrow?: true; bare?: true }): Variant => {
	const variant = VARIANTS.find(
		candidate =>
			candidate.columns &&
			candidate.index === 'pow2' &&
			candidate.hash === 'murmur3' &&
			candidate.grouped === true &&
			candidate.zero === true &&
			Boolean(candidate.narrow) === Boolean(choices.narrow) &&
			Boolean(candidate.bare) === Boolean(choices.bare),
	);
	if (!variant) {
		throw new Error('no candidate');
	}
	return variant;
};

describe('the choices of a variant', () => {
	test('that put the nodes in the order of their tags are measured in each arrangement, with and without the empty slot 0', () => {
		expect(namesOf(variant => variant.grouped)).toStrictEqual([
			'rows/pow2/murmur3+grouped',
			'columns/pow2/murmur3+grouped',
			'rows/pow2/murmur3+grouped+zero',
			'columns/pow2/murmur3+grouped+zero',
			'columns/pow2/murmur3+grouped+zero+narrow',
			'columns/pow2/murmur3+grouped+zero+bare',
			'columns/pow2/murmur3+grouped+zero+narrow+bare',
			'rows/pow2/murmur3+grouped+zero+bare',
		]);
	});

	test('that write the empty slot as 0 are measured in each arrangement, with and without the grouped nodes', () => {
		expect(namesOf(variant => variant.zero)).toStrictEqual([
			'rows/pow2/murmur3+zero',
			'columns/pow2/murmur3+zero',
			'rows/pow2/murmur3+grouped+zero',
			'columns/pow2/murmur3+grouped+zero',
			'columns/pow2/murmur3+grouped+zero+narrow',
			'columns/pow2/murmur3+grouped+zero+bare',
			'columns/pow2/murmur3+grouped+zero+narrow+bare',
			'rows/pow2/murmur3+grouped+zero+bare',
		]);
	});

	test('of the strings and of the indexes are four candidates with the nodes grouped and the empty slot 0: three in columns and one in rows', () => {
		expect(namesOf(variant => variant.narrow || variant.bare)).toStrictEqual([
			'columns/pow2/murmur3+grouped+zero+narrow',
			'columns/pow2/murmur3+grouped+zero+bare',
			'columns/pow2/murmur3+grouped+zero+narrow+bare',
			'rows/pow2/murmur3+grouped+zero+bare',
		]);
	});

	test('are bits 5 and 6 of the variant of the header, which a plain candidate does not set', () => {
		expect(variantWord(PLAIN)).toBe(0b000_0100);
		expect(variantWord({ ...PLAIN, grouped: true })).toBe(0b010_0100);
		expect(variantWord({ ...PLAIN, zero: true })).toBe(0b100_0100);
		expect(variantWord({ ...PLAIN, grouped: true, zero: true })).toBe(0b110_0100);
	});

	test('are bits 7 and 8 of the variant of the header for the strings and the indexes', () => {
		expect(variantWord(smaller({}))).toBe(0b0_0110_0101);
		expect(variantWord(smaller({ narrow: true }))).toBe(0b0_1110_0101);
		expect(variantWord(smaller({ bare: true }))).toBe(0b1_0110_0101);
		expect(variantWord(smaller({ narrow: true, bare: true }))).toBe(0b1_1110_0101);
	});

	test.each(VARIANTS)('are read back from the word of the header (%o)', variant => {
		expect(variantOf(variantWord(variant))).toStrictEqual(variant);
	});

	test('leave bit 4, and the bits after bit 8, to no candidate', () => {
		expect(() => variantOf(0b001_0100)).toThrow(/is not one of the candidates/u);
		expect(() => variantOf(0b10_0000_0100)).toThrow(/is not one of the candidates/u);
	});

	test('are not asked of a sorted index, which has no slot and no key to leave out: a header that asks is refused', () => {
		expect(() => variantOf(0b0_0100_0000)).toThrow(/is not one of the candidates/u);
		expect(() => variantOf(0b1_0000_0000)).toThrow(/is not one of the candidates/u);
		expect(() => variantOf(0b0_0000_0000)).not.toThrow();
	});
});
