import { describe, expect, test } from 'vitest';

import { NONE } from './format.ts';
import { HASH_FUNCTIONS } from './hash.ts';
import { buildMphf, lookupMphf, reduce, slotCount } from './mphf.ts';

const encoder = new TextEncoder();

/** Names that look like the names of the spec: elements, prefixed elements, attributes with a colon and a hyphen. */
function names(count: number): Uint8Array[] {
	return Array.from({ length: count }, (_, index) => {
		const prefix = ['', 'svg:', 'mml:', 'aria-', 'data-'][index % 5] ?? '';
		return encoder.encode(`${prefix}name${index.toString(36)}${'x'.repeat(index % 7)}`);
	});
}

const HASHES = HASH_FUNCTIONS;

describe('reduce', () => {
	test('keeps a number in the range and is exact for the largest', () => {
		expect(reduce(0, 237)).toBe(0);
		expect(reduce(0xFF_FF_FF_FF, 237)).toBe(236);
		expect(reduce(0x80_00_00_00, 100)).toBe(50);
	});
});

describe('slotCount', () => {
	test('is the number of keys for a minimal table and a power of two of at least one and a half times for the other', () => {
		expect(slotCount(237, 'minimal')).toBe(237);
		expect(slotCount(237, 'pow2')).toBe(512);
		expect(slotCount(8, 'pow2')).toBe(16);
		expect(slotCount(10, 'pow2')).toBe(16);
		// the half is rounded down: 11 + 5 = 16 fits in 16 slots, and 12 + 6 = 18 does not
		expect(slotCount(11, 'pow2')).toBe(16);
		expect(slotCount(12, 'pow2')).toBe(32);
	});
});

/** For each mode: the empty slots of a table of 237 keys, and whether a name that is no key has to land on a key. */
const MODES = [
	['minimal', 0, true],
	['pow2', 512 - 237, false],
] as const;

describe.each(MODES)('buildMphf (%s)', (mode, emptySlots, everyNameLandsOnAKey) => {
	describe.each(Object.keys(HASHES) as (keyof typeof HASHES)[])('with %s', hashName => {
		const hash = HASHES[hashName];
		const keys = names(237);
		const mphf = buildMphf(keys, hash, mode);

		test.each([8, 9, 16, 100, 237, 500])(
			'gives each of %i keys a slot of its own, which holds its position',
			count => {
				const own = names(count);
				const built = buildMphf(own, hash, mode);
				expect(built.slots).toBe(slotCount(count, mode));
				const positions = own.map(key => lookupMphf(built, hash, key, mode));
				expect(positions).toStrictEqual(own.map((_, index) => index));
				expect(new Set(positions).size).toBe(count);
			},
		);

		test('leaves the slots that no key has as NONE: none for a minimal table, the rest of the power of two for the other', () => {
			expect([...mphf.slotEntry].filter(entry => entry === NONE)).toHaveLength(emptySlots);
		});

		test('gives a position that is not the name, or NONE, for a name that is no key, so that the key has to be compared', () => {
			const positions = Array.from({ length: 500 }, (_, index) =>
				lookupMphf(mphf, hash, encoder.encode(`absent-${index}`), mode),
			);
			expect(positions.every(position => position === NONE || position < 237)).toBe(true);
			// a minimal table has no empty slot, so each name that is no key lands on some key
			expect(positions.every(position => position !== NONE)).toBe(everyNameLandsOnAKey);
		});

		test('is the same table when it is built again from the same keys', () => {
			const again = buildMphf(keys, hash, mode);
			expect(again.seed).toBe(mphf.seed);
			expect([...again.pilots]).toStrictEqual([...mphf.pilots]);
			expect([...again.slotEntry]).toStrictEqual([...mphf.slotEntry]);
		});
	});
});

describe('buildMphf', () => {
	test('stops for a hash that cannot tell two keys apart', () => {
		expect(() => buildMphf(names(10), () => 7, 'minimal')).toThrow('No perfect hash of 10 keys was found');
	});
});
