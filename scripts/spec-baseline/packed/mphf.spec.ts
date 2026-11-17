import { describe, expect, test } from 'vitest';

import { NONE } from './format.ts';
import { murmur3, xxhash32 } from './hash.ts';
import { buildMphf, lookupMphf, reduce, slotCount } from './mphf.ts';

const encoder = new TextEncoder();

/** Names that look like the names of the spec: elements, prefixed elements, attributes with a colon and a hyphen. */
function names(count: number): Uint8Array[] {
	return Array.from({ length: count }, (_, index) => {
		const prefix = ['', 'svg:', 'mml:', 'aria-', 'data-'][index % 5] ?? '';
		return encoder.encode(`${prefix}name${index.toString(36)}${'x'.repeat(index % 7)}`);
	});
}

const HASHES = { murmur3, xxhash32 } as const;

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

describe.each(['minimal', 'pow2'] as const)('buildMphf (%s)', mode => {
	describe.each(Object.keys(HASHES) as (keyof typeof HASHES)[])('with %s', hashName => {
		const hash = HASHES[hashName];

		test.each([8, 9, 16, 100, 237, 500])(
			'gives each of %i keys a slot of its own, which holds its position',
			count => {
				const keys = names(count);
				const mphf = buildMphf(keys, hash, mode);
				expect(mphf.slots).toBe(slotCount(count, mode));
				const positions = keys.map(key => lookupMphf(mphf, hash, key, mode));
				expect(positions).toStrictEqual(keys.map((_, index) => index));
				expect(new Set(positions).size).toBe(count);
			},
		);

		test('fills every slot of a minimal table and leaves the others of a power of two as NONE', () => {
			const mphf = buildMphf(names(237), hash, mode);
			const empty = [...mphf.slotEntry].filter(entry => entry === NONE).length;
			expect(empty).toBe(mode === 'minimal' ? 0 : mphf.slots - 237);
		});

		test('gives a position that is not the name or NONE for a name that is no key, so that the key has to be compared', () => {
			const keys = names(237);
			const mphf = buildMphf(keys, hash, mode);
			let wrong = 0;
			for (let index = 0; index < 500; index++) {
				const position = lookupMphf(mphf, hash, encoder.encode(`absent-${index}`), mode);
				if (position !== NONE) {
					wrong++;
					expect(position).toBeLessThan(237);
				}
			}
			// A minimal table has no empty slot, so each name that is no key lands on some key
			if (mode === 'minimal') {
				expect(wrong).toBe(500);
			}
		});

		test('is the same table when it is built again from the same keys', () => {
			const keys = names(237);
			const a = buildMphf(keys, hash, mode);
			const b = buildMphf(keys, hash, mode);
			expect(a.seed).toBe(b.seed);
			expect([...a.pilots]).toStrictEqual([...b.pilots]);
			expect([...a.slotEntry]).toStrictEqual([...b.slotEntry]);
		});
	});
});

describe('buildMphf', () => {
	test('is built for the whole table of a spec in a few milliseconds', () => {
		const keys = names(237);
		const start = performance.now();
		buildMphf(keys, murmur3, 'minimal');
		expect(performance.now() - start).toBeLessThan(500);
	});

	test('stops for a hash that cannot tell two keys apart', () => {
		expect(() => buildMphf(names(10), () => 7, 'minimal')).toThrow('No perfect hash of 10 keys was found');
	});
});
